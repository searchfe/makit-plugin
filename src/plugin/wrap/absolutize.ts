import { parse, parseScript } from 'esprima';
import { traverse } from 'estraverse';
import { File } from 'gulp-util';
import stream = require('readable-stream');

const Transform = stream.Transform;

export function absolutize (option: AbsolutizeOption) {
    return new Transform({
        objectMode: true,
        transform: (file: File, enc, callback) => {
            let found = false;
            Object.keys(option).forEach((origin) => {
                const moduleId = option[origin];
                if (found === false) {
                    const ast = parseScript(file.contents.toString());
                    traverse(ast, {
                        enter: (node) => {
                            if (found === false && node.type === 'CallExpression') {
                                // 如果是define
                                if (node.callee && node.callee.name === 'define') {
                                    if (node.arguments[0].type === 'Literal' && node.arguments[0].value === origin) {
                                        found = true;
                                    }
                                }
                            }
                        }
                    });
                }
                if (found) {
                    file.contents = Buffer.from(
                        file.contents.toString() +
            `\ndefine('${moduleId}', ['${origin}'], function(mod) {return mod; });`);
                }
            });
            callback(null, file);
        }
    });
}

interface AbsolutizeOption {
  // originModuleID: newModuleID
  [origin: string]: string;
}
