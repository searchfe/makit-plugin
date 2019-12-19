import { inlineTpl } from '../plugin/inline/inline-tpl';
import { readFileSync } from 'fs';
import { inlineCss } from '../plugin/inline/inline-css';
import { inlineJS } from '../plugin/inline/inline-js';
import { RecipeImpl } from '../utils/recipe-factory';
const { outputFileSync,} = require('fs-extra');

export interface hashRecipeOption {
    base: string
    staticDomain: string
}

export const tpl: RecipeImpl<hashRecipeOption, undefined> = async ({target, dep, base, staticDomain, make}) => {
    let content = readFileSync(dep).toString();
    content = await inlineCss(make, content, dep, {base});
    content = await inlineJS(make, content, dep, { base,});
    content = await inlineTpl(make, content, target, {
        base,
        staticDomain: staticDomain
    });
    content = content.replace(/('|")?(\/\/)?m.baidu.com\/se(\/)?('|")/g, '$1/se$4');
    content = content.replace(/url\(('|")?(\/static)(.*)\.(png|jpg|gif|jpeg)('|")?\)/ig, `url($1${staticDomain}$2$3.$4$5)`);
    // 后续迁移head_variable.tpl的时候需要升级
    if (process.env.DEV !== 'prod' && dep.indexOf('baidu/base/iphone/inline/head_variable.tpl') > -1) {
        content = content.replace(/\/\/m\.baidu\.com/g, '').replace(/\/\/mss0\.bdstatic\.com/, '');
    }

    outputFileSync(target, content);
}

