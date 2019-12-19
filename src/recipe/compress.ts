import {readFileSync} from 'fs';
import {minify} from 'uglify-js';
import {RecipeImpl} from '../utils/recipe-factory';

const {outputFileSync} = require('fs-extra');

export interface CompressRecipeOption {}

export const compress: RecipeImpl<CompressRecipeOption, CompressConfig> = ({target, dep}, config: CompressConfig) => {
    const content = readFileSync(dep).toString();
    outputFileSync(target, compressJs(content, config as CompressConfig));
};

export function compressJs(content: string, options: CompressConfig) {
    if (!options.compress) {
        return content;
    }
    return minify(content, options.ugilyJsConfig).code || content;
}

export interface CompressConfig {
    file: string,
    compress: boolean,
    ugilyJsConfig?: UgilyJsConfig
}

export interface UgilyJsConfig {
    output: any;
    compress: boolean | object,
    mangle?: boolean
}
