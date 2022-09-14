/**
 * @file: san.ts
 * @description ..
 */
import {readFileSync} from 'fs';
import {isAbsolute, resolve, dirname} from 'path';
import {outputFileSync} from 'fs-extra';
import {SanProjectOptions} from 'san-ssr/dist/models/san-project';
import {RecipeImpl} from '../utils/recipe-factory';

import {removeComments} from '../plugin/san/template';
import {analyzeTsDepsAndReplace} from '../plugin/san/deps';
import {ts2php as ts2phpCompiler} from '../plugin/san/ts2php';
import {createSanssr} from '../plugin/san/ssr';
import {replaceEnv} from '../plugin/san/env';

export const sanTpl: RecipeImpl<{}, undefined> = ({target, dep}) => {
    // 模板处理
    let html = readFileSync(dep).toString();
    html = removeComments(html);
    outputFileSync(target, html);
};

interface Ts2phpPreBuildRecipeOptions {
    srcRoot: string;
    buildRoot: string;
    staticDomain: string;
    env: any;
    srcAppDir: string;
    buildAppDir: string;
}
export const ts2phpPreBuild: RecipeImpl<Ts2phpPreBuildRecipeOptions, undefined> = async ({
    target, dep, srcRoot, buildRoot, make, staticDomain, env, srcAppDir, buildAppDir}) => {
    const ssrTarget = env.SSR_TARGET || 'php';

    // 依赖分析： html, lib  macro
    let newCode = await analyzeTsDepsAndReplace(make, dep, srcRoot, buildRoot, srcAppDir, buildAppDir, staticDomain, ssrTarget);
    newCode = replaceEnv(newCode, env);
    outputFileSync(target, newCode);
};

type SanPreBuildRecipeOptions = {
    // SanProject，但此代码库san-ssr版本较低，类型不匹配
    project: any;
} & Ts2phpPreBuildRecipeOptions;

export const sanPreBuild: RecipeImpl<SanPreBuildRecipeOptions, undefined> = async ({
    project, target, dep, srcRoot, buildRoot, make, staticDomain, env, srcAppDir, buildAppDir}) => {
    const ssrTarget = env.SSR_TARGET;

    // 依赖分析： html, lib  macro
    let newCode = await analyzeTsDepsAndReplace(make, dep, srcRoot, buildRoot, srcAppDir, buildAppDir, staticDomain, ssrTarget);
    newCode = replaceEnv(newCode, env);
    outputFileSync(target, newCode);
    outputFileSync(target, project.compileToSource(target));
};

interface Ts2phpRecipeOptions {
    options: any
}
export const ts2php: RecipeImpl<Ts2phpRecipeOptions, undefined> = async ({target, dep, options}) => {
    const phpCode = await ts2phpCompiler(dep, clone(options));
    outputFileSync(target, phpCode);
};

interface SanssrRecipeOptions {
    sanProjectOptions: () => SanProjectOptions;
    targetOptions: () => any
    lang?: 'php' | 'js'
}

let sanssrCompiler: any;
export const sanssr: RecipeImpl<SanssrRecipeOptions, undefined> = ({target, dep, sanProjectOptions, targetOptions, lang}) => {
    // san-ssr
    sanssrCompiler = sanssrCompiler || createSanssr(sanProjectOptions(), lang || 'php', targetOptions());
    const phpCode = sanssrCompiler(dep);
    outputFileSync(target, phpCode);
};

function clone(options: any) {
    const rs: any = Array.isArray(options) ? [] : {};
    Object.keys(options).forEach(key => {
        if (Array.isArray(options[key])) {
            rs[key] = clone(options[key]);
        }
        else if (typeof options[key] === 'object') {
            rs[key] = clone(options[key]);
        }
        else {
        // if (typeof key === 'string' || typeof key === 'function') {
            rs[key] = options[key];
        }
    });
    return rs;
}
