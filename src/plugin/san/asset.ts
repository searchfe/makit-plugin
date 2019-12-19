import { readFileSync } from "fs";
import { extname } from "path";

export function makeAsset(name: string, file: string, assetPath: string, loadType: 'img' | 'script' | 'style') {
    const conf = JSON.parse(readFileSync(`${assetPath}.md5`).toString());
    const buf = readFileSync(assetPath);
    let content: string = '';
    if (loadType === 'img') {
        const prefix = 'data:image/' + extname(assetPath).substring(1) + ';base64,';
        content = `url(${prefix}${buf.toString('base64')})`;
    } else {
        content = JSON.stringify(buf.toString());
    }
    let type = 'img';
    if (loadType === 'script') {
        type = 'js';
    } else if (loadType === 'style') {
        type = 'css';
    }
    const tmpPath = assetPath.split('/');
    const n = tmpPath[tmpPath.length - 1].replace('.', '');
    const key = n.replace('.', '');
    return `class ${name} {
        static type = "${type}";
        static code = ${content};
        static key = "${key}";
        static version = "${conf.md5}";
        static path = "${conf.relativeUrl}";
        static param() {
            return {
                type: ${name}.type,
                code: ${name}.code,
                key: ${name}.key,
                version: ${name}.version,
                path: ${name}.path
            }
        }
    }`;
}
export interface CodeConf {
    type: 'js' | 'css';
    code: string;
    key: string;
    version: string;
    path: string;
}
