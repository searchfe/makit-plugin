/*
 * @Author: qiansc
 * @Date: 2019-04-23 11:17:36
 * @Last Modified by: qiansc
 * @Last Modified time: 2019-11-29 10:47:09
 */

import { File, PluginError } from 'gulp-util';
import { include } from './filter';
import { parseAbsolute, parseBase, aliasConf } from './moduleID';
import { Parser } from './parser';
import path = require('path');
import stream = require('readable-stream');

export function amdWrap (option: IAmdWrap) {
    const alias: aliasConf[] = [];
    const projectRoot = option.projectRoot || option.baseUrl || process.cwd();
    if (option.alias) {
        option.alias.forEach((a) => {
            // console.log(111, path.resolve(projectRoot , a.path));
            alias.push({
                moduleId: a.moduleId,
                path: path.resolve(projectRoot , a.path),
                prefix: a.prefix || false });
        });
    }
    return new stream.Transform({
        objectMode: true,
        transform: (file: File, enc, callback) => {
            if (path.extname(file.path) !== '.js') {
                return callback(null, file);
            }
            // 传入baseUrl则moduleid基于baseUrl计算
            let baseUrl = file.base;
            let staticBaseUrl = option.staticBaseUrl;
            if (option.baseUrl) {
                baseUrl = option.baseUrl;
                if (option.projectRoot) {
                    baseUrl = path.resolve(option.projectRoot, baseUrl);
                }
            }
            if (staticBaseUrl && option.projectRoot) {
                staticBaseUrl = path.resolve(option.projectRoot, staticBaseUrl);
            }
            const prefix = option.prefix || '';
            const useMd5 = option.useMd5 || false;

            // let location = parseBase(file.path);
            if (include(file.path, option.exclude, option.baseUrl)) {
                // 在exlude名单中 do nothing
                // console.log('ignore', file.path);
                callback(null, file);
            } else {
                try {
                    const parser = new Parser(file.contents, file.path, baseUrl, prefix, alias, staticBaseUrl);
                    parser.hook({
                        removeModuleId: include(file.path, option.anonymousModule, option.baseUrl),
                        useMd5
                    });
                    file.contents = Buffer.from(parser.getContent());
                    file.moduleId = parser.getModuleId();
                    file.dependences = parser.getDependences();
                } catch(e) {
                    console.warn(`\x1B[33mWARN: ${file.path} compile error \n  |__${e.message}: \x1B[0m`);
                }
                callback(null, file);
            }
        }
    });
}

export interface IAmdWrap {
  /** 即项目根目录。用来配置模块查找根目录 */
  baseUrl?: string;
  /** moduleID前缀 */
  prefix?: string;
  cwd?: string;
  /** 不参与解析与调整的模块 */
  exclude?: string[];
  /** 不参与解析，只快速调整的模块 */
  exludeAnalyze?: string[];
  /** 自定义moduleID模块 */
  alias?: aliasConf[]
  moduleId?: string;
  /** 不参与生成moduleId的模块 */
  anonymousModule?: string[];
  /** 配置文件路径 */
  /** 静态资源的根目录 */
  staticBaseUrl?: string;
  /** 生成的ModuleId 是否需要md5后缀来避免其他模块引用 如 @molecule/toptip2_134dfas */
  useMd5?: any;
  /** 工程目录 */
  projectRoot?: string
}

export interface AliasConfig {
    moduleId: string,
    path: string,
    prefix: boolean
}
