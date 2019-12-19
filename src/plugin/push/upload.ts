/*
 * @Author: qiansc
 * @Date: 2019-05-07 15:30:16
 * @Last Modified by: qiansc
 * @Last Modified time: 2019-11-29 18:27:06
 */
import { parseUrl } from './fetch';
import { getToken } from './token';
import { Text } from './util';

export function upload(receiver, path, to, contents, onProcess?: (options: {path: string, to: string}) => void) {
    return new Promise((resolve, reject) => {
        const data = { ...getToken(), to };
        fupload(
            receiver, null, data, contents, path,
            (err, res) => {
                let json: {errno: number} | false = false;
                res = res && res.trim();

                try {
                    json = res ? JSON.parse(res) : null;
                } catch (e) {
                    // do nothing
                }

                if (!err && json && json.errno) {
                    reject(json);
                } else if (err || (!json && res !== '0')) {
                    const info = 'upload file [' + path + '] to [' + to + '] by receiver [' + receiver + '] error [' + (err || res) + ']';
                    reject(info);
                } else {
                    if (onProcess) {
                        onProcess({path, to});
                    } else {
                        const time = '[' + getdate() + ']';
                        process.stdout.write(
                            Text.blod(Text.green('\n - ')) +
                            Text.grey(time) + ' ' +
                            path + Text.blod(Text.yellow(' >> ')) + to
                        );
                    }

                    resolve();
                }
            }
        );
    });
}

/**
 * 遵从RFC规范的文件上传功能实现
 * @param  {String}   url      上传的url
 * @param  {Object}   opt      配置
 * @param  {Object}   data     要上传的formdata，可传null
 * @param  {String}   content  上传文件的内容
 * @param  {String}   filename 上传文件的文件名
 * @param  {Function} callback 上传后的回调
 * @memberOf fis.util
 * @name upload
 * @function
 */
function fupload (url, opt, data: {[index: string]: string | undefined}, content, filename, callback) {
    if (typeof content === 'string') {
        content = Buffer.from(content, 'utf8');
    } else if (!(content instanceof Buffer)) {
        console.error('unable to upload content [%s]', (typeof content));
    }
    opt = opt || {};
    data = data || {};
    const endl = '\r\n';
    const boundary = '-----np' + Math.random();
    const collect: any[] = [];
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const value = data[key];
            collect.push('--' + boundary + endl);
            collect.push('Content-Disposition: form-data; name="' + key + '"' + endl);
            collect.push(endl);
            collect.push(value + endl);
        }
    }
    collect.push('--' + boundary + endl);
    collect.push('Content-Disposition: form-data; name="' + (opt.uploadField || 'file') + '"; filename="' +
    filename + '"' + endl);
    collect.push(endl);
    collect.push(content);
    collect.push(endl);
    collect.push('--' + boundary + '--' + endl);

    let length = 0;
    collect.forEach((ele) => {
        if (typeof ele === 'string') {
            length += Buffer.from(ele).length;
        } else {
            length += ele.length;
        }
    });

    opt.method = opt.method || 'POST';
    opt.headers = {
        'Content-Length': length,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        ...opt.headers
    };

    opt = parseUrl(url, opt);
    const http = opt.protocol === 'https:' ? require('https') : require('http');
    const req = http.request(opt, (res) => {
        const status = res.statusCode;
        let body = '';
        res
            .on('data', (chunk) => {
                body += chunk;
            })
            .on('end', () => {
                if ((status >= 200 && status < 300) || status === 304) {
                    callback(null, body);
                } else {
                    callback(status);
                }
            })
            .on('error', (err) => {
                callback(err.message || err);
            });
    });
    req.on('error', (err) => {
        callback(err.message || err);
    });
    collect.forEach((d) => {
        req.write(d);
    });
    req.end();
}

function getdate () {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    return (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d) + ' ' + now.toTimeString().substr(0, 8);
}
