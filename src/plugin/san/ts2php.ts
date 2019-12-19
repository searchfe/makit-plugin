/**
 * @file: ts2php.ts
 * @description ..
 */
import {Ts2Php, Ts2phpOptions} from 'ts2php';
import {readFile} from 'fs-extra';

let compiler: Ts2Php;
export async function ts2php(filePath, options: Ts2phpOptions) {
    if (!compiler) {
        const compilerOptions = options.compilerOptions;
        compiler = new Ts2Php({ compilerOptions });
    }
    options.source = await readFile(filePath, 'utf8');
    const {errors, phpCode} = compiler.compile(filePath, options);
    if (errors.length) {
        const error = errors[0];
        throw new Error(error.msg || error['messageText']);
    }
    return phpCode;
}
