import { RecipeImpl } from '../utils/recipe-factory';
import { readFileSync } from 'fs';
import { minify } from 'uglify-js';
const { outputFileSync} = require('fs-extra');

export interface compressRecipeOption {}

export const compress: RecipeImpl<compressRecipeOption, CompressConfig> = ({target, dep}, config: CompressConfig) => {
    const content = readFileSync(dep).toString();
    outputFileSync(target, compressJs(content, config as CompressConfig));
}





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
