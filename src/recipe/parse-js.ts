import { RecipeImpl } from '../utils/recipe-factory';
import { loadFile } from '../utils/gulp-fs';
import { amdUriReplace } from '../plugin/apm/amd-uri';
import Parser from '../plugin/apm/parser';
const { outputFileSync } = require('fs-extra');

let parser : Parser;

export interface parseJSOption {
    amdRoot: string,
    src: string
    projectPath: string,
    base: string
}

export const parseJS: RecipeImpl<parseJSOption, undefined> = async ({target, dep, amdRoot, src, projectPath, base, make}) => {
    const file = loadFile(dep);
    parser = parser || Parser.create(projectPath, amdRoot);
    let content = await parser.parse(file.contents.toString(), src, {
        path2url: path => `__getAmdUri('${path}')`
    });
    content =  await amdUriReplace(make, content, base).catch((err: Error) => {
        console.log(err.message);
        throw new Error(`ERROR 0x008: Make error when amd-uri deal: ${dep}`);
    });
    outputFileSync(target, content);
}

