
import {existsSync} from 'fs';
import {relative, resolve} from 'path';
import * as extglob from 'extglob';
import {JakeFile} from '../utils/jake-fs';

const {copySync} = require('fs-extra');

/** 发布插件，配置暂时写在这里，等完成后迁移 */
export function release(from: string, to: string, config: ReleaseConfig[]) {
    config.forEach(conf => {
        const files = new JakeFile([conf.file]).src(from).output(to);
        files.list().forEach(file => {
            const origin = relative(to, file);
            const hashFile = resolve(from, origin + (conf.hashSubfix || '.md5'));
            if (conf.releaseOrigin === false && existsSync(hashFile)) {
                return;
            }
            copySync(resolve(from, origin), file);
        });
    });
}

export function releaseByFile(from: string, to: string, filepath: string, config: ReleaseConfig[]) {
    const subpath = relative(from, filepath);
    const conf = config.find(conf => [conf.file].some(glob => extglob.makeRe(glob).exec(filepath)));
    if (!conf) {
        return false;
    }
    return copySync(filepath, resolve(to, subpath));
}

export interface ReleaseConfig {
    file: string
    hashSubfix?: string
    releaseOrigin?: boolean
}
