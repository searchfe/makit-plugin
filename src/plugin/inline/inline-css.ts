import { dirname, resolve, extname, join } from 'path';
import * as fs from 'fs';
import Debug from 'debug';
import { replace } from '../../utils/async-replace';
const debug = Debug('inline:parseCss');

export interface InlineCssOption {
    base: string;
}
type Make = (str: string) => Promise<number>;

export async function inlineCss(make: Make, content: string | Buffer, path: string, options: InlineCssOption) {
    content = typeof content === 'string' ? content : content.toString();
    content = await replaceTextInline(make, content, path, options);
    content = await replaceImgInline(make, content, path, options);
    return content;
}

async function replaceTextInline(make: Make, content: string, path: string, options: InlineCssOption) {
    /* eslint-disable */
    const reg = /@import\s*url\(\s*['"]?\/?([^\)]+?)\?__inline?['"]?\s*\)\s*[;]*/ig;
    /* eslint-enable */;
    return await replace(content, reg, async (match: string, regPath: string) => {
        regPath = regPath.replace(/(^\/?['"]*)\/?|(['"]*$)/g, '');
        let filePath;
        if (regPath.match(/^\./)) {
            filePath = resolve(dirname(path), regPath);
        } else {
            filePath = resolve(resolve(options.base, regPath));
        }
        debug('parse content inline file', filePath);
        await make(filePath).catch(err => {
            if (extname(filePath) === "") {
                return make(filePath + '.css').then(() => {
                    console.warn(`\x1B[33mWARN: file extname should be completed: ${filePath} in ${path} \x1B[0m`);
                    filePath = filePath + '.css';
                }).catch(err => {
                    console.log(err.message);
                    throw new Error(`File not exist: ${filePath} in ${path}`);
                });
            } else {
                console.log(err.message);
                throw new Error(`File not exist: ${filePath} in ${path}`);
            }
        });
        const content = fs.readFileSync(filePath);
        switch (extname(filePath)) {
            case '.css':
            case '.less':
                return content.toString();
            default: // css
                return JSON.stringify(content.toString().replace(/\r\n/g, '\n'));
        }
    });
}

async function replaceImgInline(make: Make, content: string, filePath: string, options: InlineCssOption) {
    const imgInlineReg = /url\(\/?(.+\.png)\?(__inline).*\)/ig;
    content = await replace(content, imgInlineReg, async (s, p, i) => {
        debug('parse img inline');
        let imgPath = resolve(join(options.base, p));
        await make(imgPath).catch(() => {
            imgPath = resolve(join(dirname(filePath), p));
            return make(imgPath).catch(() => {
                throw new Error(`ERROR 0x009: Image ${p} in filePath not found`);
            });
        });
        const prefix = 'data:image/' + extname(imgPath).substring(1) + ';base64,';
        const base64String = getBase64(fs.readFileSync(imgPath)) || '';
        return `url(${prefix}${base64String})`;
    });
    return content;
}

function getBase64(data: string | Buffer | any[]) {
    if (data instanceof Buffer) {
        // do nothing for quickly determining.
    } else if (data instanceof Array) {
        data = Buffer.from(data);
    } else {
        // convert to string.
        data = Buffer.from(String(data || ''));
    }
    return data.toString('base64');
}
