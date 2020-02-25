/**
 * @file: deps.ts
 * @description 依赖分析， 先用正则强行解析一版， 后续有需要再改为分析 ast
 */
import {dirname, resolve, relative} from 'path';
import {readFileSync} from 'fs';
import { replace } from '../../utils/async-replace';
import { makeAsset } from './asset';

// 先 trick 实现
function replaceSanId(sanIdMap: Map<String, String>, oriCode: string) {

    let code = oriCode;

    sanIdMap.forEach((id, name) => {
        let replaceCount = 0;

        // controller-simple 渲染单个组件模式替换
        code = code.replace(new RegExp(`\\breturn\\s+${name}\\s*;`, 'g'), () => {
            replaceCount++;
            return `return ${JSON.stringify(id)};`;
        });


        // 渲染多个组件模式替换
        if (!replaceCount) {
            code = code.replace(new RegExp(`\\bthis\\.renderSanTpl\\(\\s*${name}\\s*,`, 'g'), () => {
                replaceCount++;
                return `this.renderSanTpl(${JSON.stringify(id)},`;
            });
        }

        if (replaceCount !== 1) {
            console.warn(`[replace san id] should replace once, replaced ${replaceCount}: ${name} -> ${id}`);
        }
    });
    return code;
}

// 针对 JS 版本的 ssr 编译时， 需要将 wise-filters 替换成 ts 版本的适配器
async function replaceModules(
    make: any, ssrTarget: string, id: string, dirPath: string, srcAppDir: string, buildAppDir: string
): Promise<string> {
    if (ssrTarget !== 'js') {
        return '';
    }

    if (id !== '@baidu/wise-better-filters') {
        return '';
    }

    const relativePath = 'lib/wise-filters.ts';
    const adaptorPath = resolve(srcAppDir, relativePath);
    let newId = relative(dirPath, adaptorPath).replace(/\.ts$/, '');
    // 当前目录加 './' 前缀， 防止 node 识别为一个 node_module， 而不是当成相对路径
    if (newId[0] !== '.') {
        newId = './' + newId;
    }
    const depPath = resolve(buildAppDir, relativePath);

    await make(depPath);

    return newId;
}

/* eslint-disable max-lines-per-function */
async function analyzeTsFile(
    make: any, filePath: string, srcDir: string, buildDir: string, srcAppDir: string, buildAppDir: string, staticDomain: string, ssrTarget: string
) {

    const reg = /import\s+((?:.|\n)+?)\s+from\s+('|")(.+?)(!(\w+))?\2;/ig;
    const dirPath = dirname(filePath);

    // 先 trick 实现
    const sanIdMap = new Map<String, String>();

    let code = readFileSync(filePath).toString();
    if (ssrTarget !== 'js') {
        // 删除所有 async， await, trick 方案， 最好改为分析语法树
        code = code
            .replace(/:\s*Promise<[^>]+?>/g, '') // 暂不支持泛型嵌套
            .replace(/\basync\s+([a-z_])/g, '$1')
            .replace(/\bawait\s+([a-z_])/g, '$1');
    }
    code = await replace(code, reg, async (m, name, quote, id: string, loader, loaderType) => {

        const key = name.trim();

        // 只处理相对路径
        if (id[0] === '.') {
            let depPath = resolve(dirPath, id);

            if (depPath.indexOf(srcAppDir) === 0) {
                depPath = buildAppDir + depPath.replace(srcAppDir, '');
            }

            // src/app 外面的文件
            else {
                depPath = buildDir + depPath.replace(srcDir, '');
            }

            switch (loaderType) {
                case 'tpl':
                    // san 模板这里加下后缀
                    depPath += '.santpl';
                    await make(depPath);
                    return `const ${key} = ${JSON.stringify(readFileSync(depPath, 'utf-8'))};`;
                case 'text':
                    await make(depPath);
                    return `const ${key} = ${JSON.stringify(readFileSync(depPath, 'utf-8'))};`;
                case 'style':
                    await make(depPath);
                    return makeAsset(key, filePath, depPath, loaderType);
                case 'script':
                    await make(depPath);
                    return makeAsset(key, filePath, depPath, loaderType);
                case 'img':
                    await make(depPath);
                    return makeAsset(key, filePath, depPath, loaderType);
                case 'san':
                    if (/\.ts$/.test(depPath)) {
                        depPath = depPath.replace(/\.ts$/, '');
                    }
                    depPath += '.ts';
                    await make(depPath);
                    const val = ssrTarget === 'php'
                        ? depPath.replace(buildAppDir + '/', '').replace(/\.san\.ts$/, '')
                        : id + '.' + ssrTarget;
                    sanIdMap.set(key, val);
                    return `const ${key} = ${JSON.stringify(val)};`;
                default:
                    if (/\.ts$/.test(depPath)) {
                        depPath = depPath.replace(/\.ts$/, '');
                    }
                    depPath += '.ts';
                    await make(depPath);
            }

        }

        // 一些 node module 的处理
        else {
            const newId = await replaceModules(make, ssrTarget, id, dirPath, srcAppDir, buildAppDir);
            if (newId) {
                return `import ${name} from '${newId}';`;
            }
        }

        return m;
    });
    return { code, sanIdMap };
}
/* eslint-enable max-lines-per-function */
export async function analyzeTsDepsAndReplace(
    make: any, filePath: string, srcDir: string, buildDir: string, srcAppDir: string, buildAppDir: string, staticDomain: string, ssrTarget: string
) {
    const {sanIdMap, code: newCode} = await analyzeTsFile(make, filePath, srcDir, buildDir, srcAppDir, buildAppDir, staticDomain, ssrTarget);

    let code = newCode;
    if (sanIdMap.size) {
        code = replaceSanId(sanIdMap, code);
    }

    return code;
}
