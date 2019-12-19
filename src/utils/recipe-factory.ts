import { Context, RecipeDeclaration } from "makit";
import { resolve } from 'path';
const extglob = require('extglob')
const matcher = require('matcher');

/**
 * @param recipeFn RecipeMaker
 * @param options 静态参数，string类型可写向前匹配 $0~$9
 * @param configs 动态配置，根据depFile查找RecipeConfig[]，传给recipe符合条件的config
 */
export function recipeFactory<O, C>(recipeImpl: RecipeImpl<O, C>, options: O = {} as O, configs?: (C & RecipeImplConfig)[]): RecipeDeclaration {
    const matchKeys: {[index: string]: boolean} = {};
    Object.keys(options).forEach(key => {
        if(typeof options[key] === 'string' && options[key].match(/\$\d/)) {
            matchKeys[key] = true;
        }
    });
    if (recipeImpl.length < 3) {
        return (context: Context) => {
            const conf = configs ? pickConfig(configs, context.targetPath(), '**/', '**') : undefined;
            return recipeImpl({
                target: context.targetPath(),
                dep: context.dependencyPath(),
                make: context.make.bind(context),
                ...(makeOptions(matchKeys, options, context) as any)
            }, conf);
        }
    } else {
        return (context: Context, done: any) => {
            const conf = configs ? pickConfig(configs, context.targetPath(), '**/', '**') : undefined;
            return recipeImpl({
                target: context.targetPath(),
                dep: context.dependencyPath(),
                make: context.make.bind(context),
                ...(makeOptions(matchKeys, options, context) as any)
            }, conf, done);
        }
    }
}

function makeOptions<O>(matchKeys, options: O, context: Context) {
    const newOptions: O = {} as any;
    Object.keys(options).forEach(key => {
        if (matchKeys[key]) {
            newOptions[key] = options[key].replace(/\$(\d+)/g, (all, index) => {
                return context.match[index];
            })
        } else {
            newOptions[key] = options[key];
        }
    });
    return newOptions;
}
export type  RecipeImpl<Option, Config> = (options: Option & RecipeImplOption, config?: Config, done?: any ) => (void | Promise<void>);


interface RecipeImplOption {
    target: string
    dep: string
    make: (target: string) => Promise<number>
}

interface RecipeImplConfig {
    file: string
    exclude?: string[],
}

/** 从配置中匹配符合filePath的配置 */
export function pickConfig<T extends Option>(configs: (T & RecipeImplConfig)[], filePath: string, baseFolder: string = '', subfix: string = ''): T {
    let config : Option | undefined;
    for(let i = configs.length -1; i >=0; i--) {
        const target = resolve(baseFolder, configs[i].file + subfix);
        if (configs[i].file.indexOf('(') > -1) {
            // Matching Mode
            const reg  = new RegExp('^' + extglob(target).replace(/\(\?:/g, '(') + '$');
            const matches = reg.exec(filePath);
            if (matches) {
                /** 这里只是浅拷贝，一层生效 */
                config = {...(configs[i] as any)};
                Object.keys(config).forEach(key => {
                    (config as any)[key] = (config as any)[key].replace(/\$(\d+)/g, (all, index) => {
                        if (matches[index]) {
                            return matches[index];
                        } else {
                            return all;
                        }
                    });
                });
                break;
            }
        } else {
            if (extglob.isMatch(filePath, target)) {
                config = configs[i];
                break;
            }
        }
    }
    return (config || {}) as T;
}

interface Option {
    [index: string]: any
}
