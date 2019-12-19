import {resolve} from 'path';

const {sync} = require('globby');
// src('aa', 'bb').output().suffix().list();

export function src(...fileGlob: string[]) {
    return new JakeFile(fileGlob);
}

/** JakeFile 是文件列表对象 可以通过链式指令去配置各种glob规则和预处理 最终通过list导出符合规则的列表 */
export class JakeFile {
    private srcDir = process.cwd();
    private outDir: string;
    private subfixStr: string;
    public ignoreGlob: string[] = [];
    constructor(public fileGlob: string[]) {}
    public src(srcDir: string) {
        this.srcDir = resolve(process.cwd(), srcDir);
        return this;
    }
    public ignore(...ignoreGlob: string[]) {
        this.ignoreGlob = ignoreGlob;
        return this;
    }
    public output(outDir: string) {
        this.outDir = resolve(process.cwd(), outDir); ;
        return this;
    }
    public subfix(str: string) {
        this.subfixStr = str;
        return this;
    }
    public list(): string[] {
        const t = new Date().getTime();
        const fileGlob = this.fileGlob.map(glob => resolve(this.srcDir, glob));
        this.ignoreGlob.forEach(ignore => {
            fileGlob.push('!' + resolve(this.srcDir, ignore));
        });
        let list: string[] = sync(fileGlob);

        if (this.srcDir && this.outDir) {
            list = list.map(item => item.replace(this.srcDir, this.outDir));
        }
        if (this.subfixStr) {
            list = list.map(item => item + this.subfixStr);
        }
        console.log(`List ${list.length} files cost ${new Date().getTime() - t} ms`);
        return list;
        // vfs.src(this.fileGlob).pipe(map((file, cb) => {
        //     // console.log(file.path);
        // }));
        // console.log(new Date().getTime() - t);
        // return new Promise((resolve, reject) => {
        //     setTimeout(() => {
        //         console.log('Finished B');
        //         resolve(['a', 'b']);
        //       }, 1050);
        // });
    }
}

/** Glob文件选择器 */
type FileGlob = string[];
