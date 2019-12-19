/**
 * @author
 * @file
 */
import {resolve, basename, dirname} from 'path';
import {readFileSync} from 'fs';
import {SanProject} from 'san-ssr';
import * as log from 'fancy-log';

export type CompilerFuntion = (filePath: string) => string;

export function sanssr(options, target, targetOptions): CompilerFuntion {
    let project: SanProject | null = null;

    const nsPrefixFn = typeof targetOptions.nsPrefix === 'function'
        ? targetOptions.nsPrefix
        : () => targetOptions.nsPrefix;

    return function (filePath) {
        if (!project) {
            project = new SanProject(options);
        }

        const nsPrefix = nsPrefixFn(filePath);

        try {
            return project.compile(filePath, target, {
                ...targetOptions, nsPrefix, noTemplateOutput: true
            });
        }
        catch (e) {
            log('[san-ssr] error when compiling:', filePath);
            throw e;
        }

    };
}

export function createSanssr(buildDir) {
    const buildAppDir = resolve(buildDir, 'san-app');

    function readSourceFile(relativePath) {
        const filePath = resolve(buildAppDir, relativePath);
        return readFileSync(filePath, 'utf-8');
    }

    return sanssr(
        {
            tsConfigFilePath: resolve(buildAppDir, 'tsconfig.json'),
            modules: {
                // 原生 PHP 函数全部改为 ts 实现后可删除
                '../types/php': readSourceFile('fake/php.js'),
                // rd 插件 ready 后可以删除
                '@baidu/wise-better-filters': readSourceFile('fake/filters.js')
            }
        },
        'php',
        {
            nsPrefix: filePath => {
                const fileName = basename(filePath, '.san.ts');
                const dirName = dirname(filePath);
                const ns = ('wise/zh-CN/page' + dirName.replace(buildDir, '')
                                + '/' + fileName + '/').replace(/\//g, '\\');
                return ns.replace(/-/g, '_');
            },
            modules: {
                '@baidu/wise-better-filters': {
                    name: '@baidu/wise-better-filters', // 临时方案，仅供开发期间使用
                    // @todo @yurong 后面看看优化下
                    path: '"/home/work/search/view-ui/php/phplib/ext/smarty/baiduplugins/shared.wiseSanFilters.php"'
                }
            }
        }
    );
}
