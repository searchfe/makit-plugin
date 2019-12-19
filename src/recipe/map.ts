import { existsSync } from 'fs';
import { copySync, utimes, writeFile } from 'fs-extra';
import { makeHash } from './hash';
import { RecipeImpl } from '../utils/recipe-factory';

interface MapOption {
    baseFolder: string
    staticDomain: string
}

export const map: RecipeImpl<MapOption, undefined> =  async({target, dep, baseFolder, staticDomain, make}) => {
    copySync(dep, target);
    if (existsSync(dep + '.md5') && baseFolder && staticDomain) {
        await makeHash({
            target: target + '.md5',
            dep: target,
            baseFolder,
            staticDomain,
            make,
        }, {
            file: dep,
            md5: true
        });
    }
};

export const touch = async ({target}) => {
    const now = new Date();
    try {
        await utimes(target, now, now);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return writeFile(target, '')
        }
        throw err
    }
};
