
import {Transform} from 'stream';
import {RecipeImpl} from '../utils/recipe-factory';
import {loadFile, File} from '../utils/gulp-fs';
import {amdWrap, AliasConfig} from '../plugin/wrap/index';
import {IAmdWrap} from '../plugin/wrap/hook';

const {outputFileSync} = require('fs-extra');

export interface WrapRecipeOption {
    base: string,
    alias: AliasConfig[]
}

export const wrap: RecipeImpl<WrapRecipeOption, AmdWrapConfig> = ({target, dep, alias, base}, config: AmdWrapConfig) => {
    const conf = config;
    const file = loadFile(dep);
    const amd = amdWrap({alias, 'projectRoot': base, ...conf} as IAmdWrap);
    if (!conf.baseUrl && !file.base) {
        throw new Error(`File does not have wrap config: ${target}`);
    }
    (amd as Transform)._transform(file, 'utf-8', (enc, file: File) => {
        outputFileSync(target, file.contents);
    });
};

export interface AmdWrapConfig {
    /** FileGlob */
    file: string
    baseUrl: string
    moduleId?: string
    alias?: AliasConfig[]
    exclude?: string[]
    prefix?: string
    staticBaseUrl?: string
}
