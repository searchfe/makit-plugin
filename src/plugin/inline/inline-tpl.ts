import { extname } from 'path';
import { readFileSync, existsSync } from 'fs';
import { replace } from '../../utils/async-replace';
import Debug from 'debug';
import { absolutize } from '../../utils/path-extra';
import { getHashFile } from '../hash';
const debug = Debug('inline:parseTpl');

type Make = (str: string) => Promise<number>;

export async function inlineTpl (make: Make, content: string, path: string, options: TplInlineOption) {
    content = await inline(make, /<link.*href\s*=\s*('|")\/?(.+)\?(__lsInline|__inline)\1.*>/ig, content, path, options);
    content = await inline(make, /<script.*src\s*=\s*('|")\/?(.+)\?(__lsInline|__inline)\1[^>]*>[\s\S]*?<\/script>/ig, content, path, options);
    content = await modifySourceUrl(make, content, options.staticDomain, options.base, path);
    return content;
}

async function inline (make: Make, reg: RegExp, content: string, path: string, options: TplInlineOption) {
    return replace(content, reg, async (all, quote, value, type) =>  {
        let inlinecontent = '';
        if (type) {
            switch (type) {
            case '__lsInline':
                debug('link lsInline', path);
                let lsPath = absolutize(value, path, options.base);
                await make(lsPath + '.md5').catch(() => {
                        throw new Error(`ERROR 0x003: File not exist: ${lsPath} in ${path}`);
                });
                const tmpPath = value.split('/');
                const name = tmpPath[tmpPath.length - 1].replace('.', '');
                const key = name.replace('.', '');
                let type = extname(lsPath).replace('.', '').replace(/less/, 'css');
                if (!['css', 'js'].includes(type)) {
                    throw new Error(`ERROR 0x004: Could not inline: ${lsPath} in ${path}`);
                }
                const hashFile = getHashFile(lsPath);
                const hash = hashFile.md5;
                if (hash === '') {
                    throw new Error(`ERROR 0x005: Hash Error when inline: ${lsPath} in ${path}`);
                }
                const srcPath = hashFile.url;
                const captureStr = '{%capture name ="' + name + '"%}' + getSourceContent(make, lsPath, false) + '{%/capture%}';
                const feLsInlineStr = '{%fe_ls_inline codeConf=["type"=>"' + type + '"' +
                            ',"code"=>$smarty.capture.' + name +
                            ',"key"=>"' + key + '"' +
                            ',"path"=>"' + srcPath + '"' +
                            ',"version"=>"' + (hash || '') + '"] lsControl=$lsControl%}';
                inlinecontent += captureStr + feLsInlineStr;
                break;
            case '__inline':
                debug('link inline', path);
                let filePath = absolutize(value, path, options.base);
                let classAttr = '';
                await make(filePath);
                // @todo 目前所有tpl都会过一次link匹配，后续看是否有优化空间。
                const res = all.match(/<link.*(class\s*=\s*['|"][^"]*['|"]).*>/i);
                classAttr = res ? res[1] : '';
                inlinecontent += getSourceContent(make, filePath, true, classAttr);
                break;
            }
        }
        return inlinecontent;
    });
}

function getSourceContent (make: Make, filePath: string, inner: boolean = true, attr: string = '') {
    const type = extname(filePath);
    const content = readFileSync(filePath);
    switch (type) {
        case '.css':
        case '.less':
            return inner === true ? `<style type="text/css"${attr ? " " + attr : ""}>\n${content}\n</style>` : content;
        case '.js':
            // 把文件内容放到script标签 中间
            return inner === true ? `<script type="text/javascript">\n${content}\n</script>` : content;
        case '.tpl':
            return readFileSync(filePath);
        default:
            console.warn(`\x1B[33mWARN: Unkonw inline Type: ${filePath} \x1B[0m`);
            return readFileSync(filePath);
    }
}


export declare interface TplInlineOption {
    base: string,
    staticDomain: string,
}

async function modifySourceUrl(make: Make, content: string, prefix: string, base: string, file: string) {
    content = content.replace(/url\(('|")?(\/static)(.*)\.(png|jpg|gif|jpeg)('|")?\)/ig, "url($1" + prefix + "$2$3.$4$5)");
    return await replace(content, /(href|src)\s*=\s*('|")(\/static\/\S+\.[a-zA-Z?]+)('|")/g, async (all, href, quote, value) => {
        let filePath = base + value.split('?')[0];
        let output = '';
        await make(filePath + '.md5').then(() => {
            if (existsSync(filePath + '.md5')) {
                const hashFile = getHashFile(filePath);
                const hash = hashFile.md5;
                if (hash !== '') {
                    output = value.replace(/(\.[a-zA-Z?]+)/g, "_" + hash + "$1");
                    // throw new Error(`ERROR 0x005: Hash Error when inline: ${filePath} in ${file}`);
                } else {
                    output = value;
                }
                // output = value.replace(/(\.[a-zA-Z?]+)/g, "_" + hash + "$1");
            } else {
                console.warn(`\x1B[33mWARN: not exist md5 ${value} in ${file} \x1B[0m`);
                output = value;
            }
        }).catch((err) => {
            console.log(err.message);
            throw new Error(`\x1B[33mWARN: not exist source ${value} in ${file} \x1B[0m`);
            // output = value.replace(/(\.[a-zA-Z]+)/g, "_$1");
        });
        return href + '=' + quote + ('{%$staticDomain%}/se' + output).replace('//', '/') + quote;
    });
}
