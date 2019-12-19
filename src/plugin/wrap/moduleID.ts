import { extname, resolve } from 'path';
/** 将相对路径转化为绝对路径 ./A ../ */
export function parseAbsolute (
    /** 当前路径 */
    cwd: string,
    /** 分析的ast node,因为ast库没有支持ts,所以ast类型为any */
    moduleID: string
): string {
    if (moduleID.match(/^(\.\/|\.\.\/)/)) {
        return resolve(cwd, moduleID);
    }
    return moduleID;
}

/** 将绝对路径转化为基于BaseURL的 ModuleId */
export function parseBase (
    /** 当前路径 */
    baseUrl: string,
    /** 文件路径 */
    filePath: string,
    /** moduleID前缀 */
    prefix?: string,
    /** 自定义moduleId */
    alias: aliasConf[] = []): string {
    if (extname(filePath) === '.json') {
        return parseJsonBase(baseUrl, filePath);
    }

    let conf: aliasConf | undefined;
    alias.forEach(a => {
        if (a.path === filePath || a.path.replace(/(\.js|\.ts)$/, '') === filePath.replace(/(\.js|\.ts)$/, '')) {
            conf = a;
        }
    });

    if (conf !== undefined) {
        if (conf.prefix) {
            return prefix + '/' + conf.moduleId;
        } else {
            return conf.moduleId;
        }
    }

    if (filePath.match(/^\//) !== null && filePath.indexOf(baseUrl) === 0) {
        return (prefix ? prefix + '/' : '') + filePath.substring(baseUrl.length + 1).replace(/(\.js|\.ts)$/, '');
    }
    return (prefix ? prefix + '/' : '') + filePath.replace(/(\.js|\.ts)$/, '');
}
export function parseJsonBase (
    /** 当前路径 */
    baseUrl: string,
    /** 文件路径 */
    filePath: string): string {
    if (filePath.indexOf(baseUrl) === 0) {
        return filePath.substring(baseUrl.length + 1);
    }
    return filePath;
}

export interface aliasConf {
  /** 自定义moduleID */
  moduleId: string;
  /** 自定义module path */
  path: string;
  /** 带上别名 */
  prefix?: boolean;
}
