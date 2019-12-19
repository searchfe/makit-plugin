/*
 * @Author: qiansc
 * @Date: 2019-05-08 16:52:23
 * @Last Modified by: qiansc
 * @Last Modified time: 2019-05-09 20:02:20
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';

const HOME = homedir();
let TOKEN_FILE = `${HOME}/.fis3-tmp/deploy.json`;

if (!existsSync(TOKEN_FILE)) {
    // 优先使用FIS3全局TOKEN 因为机器唯一 使用不同TOKEN会导致频繁验证
    TOKEN_FILE = `${HOME}/.gulp-deploy-http-push.json`;
}

const TOKEN_PATH = resolve(TOKEN_FILE);

let token: null|IToken = null;

export function getToken (): IToken {
    if (token !== null) {
        return token;
    }
    token = existsSync(TOKEN_PATH)
        ? JSON.parse(readFileSync(TOKEN_PATH).toString() || '{}') as IToken
        : {};
    return token;
}

export function writeToken (options) {
    writeFileSync(TOKEN_PATH, JSON.stringify(options, null, 2));
    token = options;
}

export interface IToken {
  email?: string;
  code?: string;
  token?: string;
}
