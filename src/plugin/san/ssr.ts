/**
 * @author
 * @file
 */
import {SanProject} from 'san-ssr';
import * as log from 'fancy-log';
import {SanProjectOptions} from 'san-ssr/dist/models/san-project';

export type CompilerFuntion = (filePath: string) => string;

export function createSanssr(options: SanProjectOptions, target: string, targetOptions): CompilerFuntion {
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
