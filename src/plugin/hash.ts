import * as crypto from 'crypto';

import { basename, dirname } from 'path';
import { readFileSync } from 'fs';

export function md5(content: string, filePath: string): HashFile {
    const md5Hash = getMd5(content, 7);
    let filename = basename(filePath);
    const dir = dirname(filePath);
    filename = filename.split('.').map(function (item, i, arr) {
        return i === arr.length - 2 ? item + '_' + md5Hash : item;
    }).join('.');
    return {
        file: filePath,
        md5: md5Hash,
        path: `${dir}/${filename}`,
    };
}

interface HashFile {
    file: string
    md5: string
    path: string
    url?: string
}


function getMd5 (data: string, len: number = 7) {
    const md5sum = crypto.createHash('md5');
    md5sum.update(data, 'utf8');
    return md5sum.digest('hex').substring(0, len);
}

// export function matchFileMd5 (filePath: string) {
//     const info = readFileSync(filePath + '.md5').toString();
//     // const matches = hashPath.match(/\_([0-9a-z]+)\.([^.]+)$/);
//     if (info.length <= 0) {
//         return '';
//     }
//     const file: HashFile = JSON.parse(info);
//     return file.md5;
// }

export function getHashFile (filePath: string) {
    const info = readFileSync(filePath + '.md5').toString();
    const file: HashFile = JSON.parse(info);
    return file;
}

export interface HashConfig {
    file: string;
    md5: boolean
}
