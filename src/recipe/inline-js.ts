import { RecipeImpl } from '../utils/recipe-factory';
import { readFileSync } from 'fs';
import { inlineJS as inline } from '../plugin/inline/inline-js';
const { outputFileSync} = require('fs-extra');

export interface inlineOption {
    base: string
}

export const inlineJS: RecipeImpl<inlineOption, undefined> = async ({target, dep, base, make}) => {
    const content = readFileSync(dep).toString();
    outputFileSync(target, await inline(make, content, dep, {base}));
}
