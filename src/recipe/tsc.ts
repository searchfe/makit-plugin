import {isAbsolute, resolve, dirname} from 'path';
import {outputFileSync, existsSync} from 'fs-extra';
import * as ts from 'typescript';
import {RecipeImpl} from '../utils/recipe-factory';

/** 更换编译目录时，修正CompilerOptions的一些相对路径配置 */
export const formatCompilerOptions: RecipeImpl<{}, undefined> = ({target, dep}) => {
    const configFile = ts.readConfigFile(dep, ts.sys.readFile);

    const targetDir = dirname(target);
    const compilerOptions = getCompilerOptions(configFile, targetDir);
    const tsConfig = configFile.config;

    // 修正 baseUrl
    // let baseUrl = compilerOptions.baseUrl;
    // if (baseUrl && !isAbsolute(baseUrl)) {
    //     baseUrl = resolve(targetDir, baseUrl);
    //     compilerOptions.baseUrl = baseUrl;
    // }
    // if (compilerOptions.typeRoots && compilerOptions.typeRoots.length) {
    //     compilerOptions.typeRoots = compilerOptions.typeRoots.map(root => {
    //         if (!isAbsolute(root)) {
    //             return resolve(baseUrl, root);
    //         }
    //         return root;
    //     });
    // }
    compilerOptions.target = configFile.config.compilerOptions.target;
    compilerOptions.module = configFile.config.compilerOptions.module;
    tsConfig.compilerOptions = compilerOptions;

    outputFileSync(target, JSON.stringify(tsConfig, null, 4));
};

const configCache: {[index:string]: ts.CompilerOptions} = {};

export const tscImpl: RecipeImpl<{tsconfig: string}, undefined> = async ({target, dep, tsconfig}) => {
    if (configCache[tsconfig] === undefined) {
        configCache[tsconfig] = ts.readConfigFile(tsconfig, ts.sys.readFile).config;
    }
    /** 添加到编译队列，等待队列批量编译 */
    await addTocompile(dep, configCache[tsconfig]);
};

function getCompilerOptions(configFile: {
    config?: any;
    error?: ts.Diagnostic;
}, baseUrl?: string) {
    const parseConfigHost: ts.ParseConfigHost = {
        'fileExists': ts.sys.fileExists,
        'readFile': ts.sys.readFile,
        'readDirectory': ts.sys.readDirectory,
        'useCaseSensitiveFileNames': true
    };

    return ts.parseJsonConfigFileContent(
        configFile.config,
        parseConfigHost,
        baseUrl || configFile.config.baseUrl || './'
    ).options;
}

let fileList: Array<[ts.CompilerOptions, string[], any[]]> = [];
let timer: any;

function addTocompile(file: string, options: ts.CompilerOptions) {
    clearTimeout(timer);
    timer = setTimeout(() => {
        fileList.forEach(item => {
            compile(item[1], item[0]);
            item[2].forEach(resolve => {
                resolve();
            });
        });
        fileList = [];
        timer = null;
    /** 2s 清空一次编译队列 */
    }, 2000);

    return new Promise(resolve => {
        let find = false;
        fileList.forEach(item => {
            if (item[0] === options) {
                item[1].push(file);
                item[2].push(resolve);
                find = true;
            }
        });
        if (!find) {
            fileList.push([options, [file], [resolve]]);
        }
    });
}

function compile(fileNames: string[], options: ts.CompilerOptions): void {
    let program = ts.createProgram(fileNames, options);
    let emitResult = program.emit();

    let exitCode = emitResult.emitSkipped ? 1 : 0;
    if (exitCode !== 0) {
        let allDiagnostics = ts
            .getPreEmitDiagnostics(program)
            .concat(emitResult.diagnostics);
        allDiagnostics.forEach(diagnostic => {
            if (diagnostic.file) {
                let {line, character} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
            }
            else {
                console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
            }
        });
        throw new Error(`Typescript exiting with code '${exitCode}'`);
    }
}
