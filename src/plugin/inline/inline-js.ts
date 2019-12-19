import { extname} from 'path';
import { readFileSync} from 'fs';
import Debug from 'debug';
import { replace } from '../../utils/async-replace';
import { absolutize } from '../../utils/path-extra';
const debug = Debug('inline:parseJs');

export interface InlineJSOption {
    base: string;
}
type Make = (str: string) => Promise<number>;

export async function inlineJS(make: Make, content: string | Buffer, path: string, options: InlineJSOption) {
    content = typeof content === 'string' ? content : content.toString();
    content = await replaceInline(make, content, path, options);
    content = content.replace(/('|")?(\/\/)?m.baidu.com\/se(\/)?('|")/g, '$1/se$4');
    return content;
}

async function replaceInline(make: Make, content: string, path: string, options: InlineJSOption) {
    const reg = /__inline\s*\(\s*([^\)]+)\s*\)\s*([;\,]?)/ig;
    return await replace(content, reg, async (match: string, regPath: string, q: string) => {
        regPath = regPath.replace(/\n/g, '');
        regPath = regPath.replace(/(^\/?['"]*)\/?|(['"]*$)/g, '');
        let filePath = absolutize(regPath, path, options.base);
        debug('parse content inline file', filePath);

        if (extname(filePath) === "") {
            // 无后缀时尝试补全
            filePath += '.js'
            console.warn(`\x1B[33mWARN: file extname should be completed: ${filePath} in ${path} \x1B[0m`);
        }
        await make(filePath);
        const content = readFileSync(filePath);
        switch (extname(filePath)) {
            case '.js':
                // 先压缩后替换的话，需要支持,结尾
                return content.toString() + (q? ';' : '') + '\n';
            default: // etpl css
                return JSON.stringify(content.toString().replace(/\r\n/g, '')) + (q? q : '') + '\n';
        }
    });
}
