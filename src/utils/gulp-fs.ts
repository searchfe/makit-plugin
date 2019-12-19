import { Stats, statSync, readFileSync } from 'fs';

/** 导出一个符合gulp-file接口的对象 */
export function loadFile(filePath: string) {
    const path: string = filePath; // resolve(filePath);
    const file = new File();
    file.path = path;
    file.contents = readFileSync(path);
    file.stat = statSync(path);
    return file;
}

export class File {
    base?: string;
    path: string;
    contents: Buffer;
    stat: Stats;
    public isNull() {
        if (this.contents.length === 0) {
            console.log(`\x1B[33mWARN: files can not be empty: ${this.path} \x1B[0m`);
        }
        return false;
    }
    public isStream() {
        return false;
    }
    public isBuffer() {
        return true;
    }
}
