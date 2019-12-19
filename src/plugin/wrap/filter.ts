/*
 * @Author: qiansc
 * @Date: 2019-04-25 17:28:25
 * @Last Modified by: qiansc
 * @Last Modified time: 2019-06-05 10:29:53
 */
import * as minimatch from 'minimatch';
import { resolve } from 'path';

/**
 * 判断文件filePath是否在规则覆盖范围内
 */
export function include (filePath: string, patterns?: string[], baseUrl?: string): boolean {
    if (patterns === undefined) {
        return false;
    }
    for (const pattern of patterns) {
        let condition = pattern;
        if (baseUrl) {
            condition = resolve(baseUrl, pattern);
        }
        if (minimatch(filePath, condition)) {
            return true;
        }
    }
    return false;
}
