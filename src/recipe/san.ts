/**
 * @file: san.ts
 * @description ..
 */
import {readFileSync} from 'fs';
import {isAbsolute, resolve, dirname} from 'path';
import {outputFileSync} from 'fs-extra';
import {RecipeImpl} from '../utils/recipe-factory';

import {removeComments} from '../plugin/san/template';
import {analyzeTsDepsAndReplace} from '../plugin/san/deps';
import {ts2php as ts2phpCompiler} from '../plugin/san/ts2php';
import {createSanssr} from '../plugin/san/ssr';
import {replaceEnv} from '../plugin/san/env';

export const formatCompilerOptions: RecipeImpl<{}, undefined> = ({target, dep}) => {
    const tsConfig = require(dep);
    const compilerOptions = tsConfig.compilerOptions || {};

    const targetDir = dirname(target);

    // 修正 baseUrl
    let baseUrl = compilerOptions.baseUrl;
    if (baseUrl && !isAbsolute(baseUrl)) {
        baseUrl = resolve(targetDir, baseUrl);
        compilerOptions.baseUrl = baseUrl;
    }
    if (compilerOptions.typeRoots && compilerOptions.typeRoots.length) {
        compilerOptions.typeRoots = compilerOptions.typeRoots.map(root => {
            if (!isAbsolute(root)) {
                return resolve(baseUrl, root);
            }
            return root;
        });
    }

    tsConfig.compilerOptions = compilerOptions;

    outputFileSync(target, JSON.stringify(tsConfig, null, 4));
};

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
}
export const ts2phpPreBuild: RecipeImpl<Ts2phpPreBuildRecipeOptions, undefined> = async ({
    target, dep, srcRoot, buildRoot, make, staticDomain, env}) => {
    const ssrTarget = env.SSR_TARGET || 'php';

    // 依赖分析： html, lib  macro
    let newCode = await analyzeTsDepsAndReplace(make, dep, srcRoot, buildRoot, staticDomain, ssrTarget);
    newCode = replaceEnv(newCode, env);
    outputFileSync(target, newCode);
};

interface Ts2phpRecipeOptions {
    buildRoot: string;
}
export const ts2php: RecipeImpl<Ts2phpRecipeOptions, undefined> = async ({target, dep, buildRoot}) => {
    // ts2php
    const options = require(`${buildRoot}/san-app/ts2phprc`);
    const phpCode = await ts2phpCompiler(dep, options.clone());
    outputFileSync(target, phpCode);
};

interface SanssrRecipeOptions {
    buildRoot: string;
}
let sanssrCompiler: any;
export const sanssr: RecipeImpl<SanssrRecipeOptions, undefined> = ({target, dep, buildRoot}) => {
    // san-ssr
    sanssrCompiler = sanssrCompiler || createSanssr(buildRoot);
    const phpCode = sanssrCompiler(dep);
    outputFileSync(target, phpCode);
};
