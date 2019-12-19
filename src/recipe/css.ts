import {readFileSync} from 'fs';
import * as less from 'less';
import * as CleanCSS from 'clean-css';
import {inlineCss as inline} from '../plugin/inline/inline-css';
import {RecipeImpl} from '../utils/recipe-factory';

const {outputFileSync, copySync} = require('fs-extra');

interface InlineCssRecipeOption {
    base: string
    staticDomain: string
}

export const compressCss: RecipeImpl<{}, undefined> = ({target, dep}) => {
    const content = readFileSync(dep, 'utf-8');
    outputFileSync(target, compress(content, {'compress': true}));
};

export const inlineCss: RecipeImpl<InlineCssRecipeOption, undefined> = async ({target, dep, base, staticDomain, make}) => {
    let content = readFileSync(dep).toString();
    content = await inline(make, content, target, {base});
    content = modifyUrl(content, staticDomain);
    outputFileSync(target, content);
};

interface LessToCssRecipeOption {
    cssPath: string
}

export const lessToCss: RecipeImpl<LessToCssRecipeOption, undefined> = async ({target, dep, cssPath, make}) => {
    copySync(dep, target);
    copySync(dep, cssPath);
};

export const compileLess: RecipeImpl<{}, undefined> = ({target, dep}) => {
    let content = readFileSync(dep, 'utf-8');
    less.render(content, (e, output) => {
        content = output && output.css ? output.css : '';
    });
    outputFileSync(target, content);
};

export function modifyUrl(content: string, prefix: string) {
    const result = content.replace(/url\(('|")?(\/static)(.*)\.(png|jpg|gif|jpeg)('|")?\)/ig, `url($1${prefix}$2$3.$4$5)`);
    return result;
}

export function compress(content: string, options: CompressCssOption) {
    let txt =  content;
    if (options.compress) {
        txt = new CleanCSS(options.cleanCssConfig ? options.cleanCssConfig : {'format': 'keep-breaks'}).minify(content).styles;
    }
    return txt;
}

interface CompressCssOption {
    compress: boolean,
    cleanCssConfig?: CleanCssConfig;
}

interface CleanCssConfig {

}
