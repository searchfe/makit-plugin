/*
 * @Author: qiansc
 * @Date: 2019-05-07 14:31:35
 * @Last Modified by: qiansc
 * @Last Modified time: 2019-10-28 14:50:51
 *
 * fis3插件重构而来，实现不是很优雅
 */
const URL = require('url');

export function fetch (url, data, callback) {
    // var endl = '\r\n';
    const collect: string[] = [];
    let opt: IOption = {};
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            collect.push(key + '=' + encodeURIComponent(data[key]));
        }
    }

    const content = collect.join('&');
    opt.method = opt.method || 'POST';
    opt.headers = {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
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
                    let json: IStatus | false = false;
                    try {
                        json = JSON.parse(body);
                    } catch (e) {
                        // do nothing
                    }

                    if (json === false || json.errno) {
                        callback(json || 'The response is not valid json string.');
                    } else {
                        callback(null, json);
                    }
                } else {
                    callback(status);
                }
            })
            .on('error', (err) => {
                callback(err.message || err);
            });
    });
    req.write(content);
    req.end();
}

interface IStatus {
  errno: number;
}
interface IOption {
  agent?: string;
  method?: string;
  host?: string;
  hostname?: string;
  port?: number;
  headers?: {
    'Content-Type': string;
  };
  protocol?: string;
  path?: string;
}

export function parseUrl (url, opt: IOption) {
    opt = opt || {};
    /* eslint-disable-next-line */
    url = URL.parse(url);
    const ssl = url.protocol === 'https:';
    opt.host = opt.host || opt.hostname || ((ssl || url.protocol === 'http:') ? url.hostname : 'localhost');
    opt.port = opt.port || (url.port || (ssl ? 443 : 80));
    opt.path = opt.path || (url.pathname + (url.search ? url.search : ''));
    opt.method = opt.method || 'GET';
    opt.agent = opt.agent || undefined;
    return opt;
}
