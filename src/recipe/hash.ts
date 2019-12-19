
import {copyFileSync, readFileSync, existsSync} from 'fs';
import {outputFileSync} from 'fs-extra';
import {RecipeImpl} from '../utils/recipe-factory';
import {HashConfig, md5} from '../plugin/hash';

export interface HashRecipeOption {}

export const hash: RecipeImpl<HashRecipeOption, HashConfig> = async ({target, dep}, config: HashConfig) => {
    copyFileSync(dep, target);
};

interface MakeHashOption {
    baseFolder: string
    staticDomain: string
    origin?: string
}
/* eslint-disable no-param-reassign */
export const makeHash: RecipeImpl<MakeHashOption, HashConfig> = ({target, dep, baseFolder, staticDomain, origin}, config: HashConfig) => {
    origin = origin || dep;
    let info: any = {};
    if (config && config.md5) {
        const content = readFileSync(dep).toString();
        const rs = md5(content, origin);
        const relativeUrl = rs.path.replace(baseFolder + '/', '');

        outputFileSync(rs.path, content);
        info = {
            'file': origin,
            'md5': rs.md5,
            'path': rs.path,
            relativeUrl,
            'url': staticDomain + relativeUrl
        };
    }
    else if (config) {
        const relativeUrl = origin.replace(baseFolder + '/', '');
        info = {
            'file': origin,
            'md5': '',
            'path': origin,
            relativeUrl,
            'url': staticDomain + relativeUrl
        };
        if (!existsSync(origin)) {
            copyFileSync(dep, origin);
        }
    }
    copyFileSync(dep, target);
    outputFileSync(target + '.md5', JSON.stringify(info, null, '\n'));
};
