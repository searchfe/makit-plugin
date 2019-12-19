import {readFileSync} from 'fs';
import {RecipeImpl} from '../utils/recipe-factory';
import {inlineJS as inline} from '../plugin/inline/inline-js';

const {outputFileSync} = require('fs-extra');

export interface InlineOption {
    base: string
}

export const inlineJS: RecipeImpl<InlineOption, undefined> = async ({target, dep, base, make}) => {
    const content = readFileSync(dep).toString();
    outputFileSync(target, await inline(make, content, dep, {base}));
};
