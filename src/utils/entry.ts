import {extname, basename, dirname, join} from 'path';

const {sync} = require('globby');

/* eslint-disable no-param-reassign */
/** 根据配置获得入口文件列表 */
export function entryImpl(entries: Entry[]) {
    let files: string[] = [];
    entries.forEach(conf => {
        let globs = conf.files.map(item => `${conf.from}/${item}`);
        globs = globs.concat((conf.ignore || []).map(item => `!${conf.from}/${item}`));
        files = files.concat(sync(globs).map(file => {
            file = file.replace(conf.from, conf.to);
            if (conf.ext) {
                const dirName = dirname(file);
                const extName = extname(file);
                const baseName = basename(file, extName);
                file = join(dirName, baseName + conf.ext);
            }
            return file + (conf.subfix || '');
        }));
    });
    return files;
}

export function entry(entries: Entry[] | Entry) {
    if (!Array.isArray(entries)) {
        entries = [entries];
    }
    const begin = Date.now();
    const files = entryImpl(entries);
    console.log(`${files.length} entries found in ${Date.now() - begin}ms`);
    return files;
}

export interface Entry {
    files: string[]
    ignore?: string[],
    from: string,
    to: string,
    ext?: string,
    subfix?: string,
}
