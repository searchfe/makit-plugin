/**
 * @file: template.ts
 * @description .对 san 的模板的
 */

// 删除模板中的注释， 主要针对模板中的 js 和 css 部分
// 也适用于 ts
// @note: 双斜杠注释的双斜杠后面必须有空格， 否则不会删除这个注释， 即
//    后面这个注释会删除: // x
//    后面这个注释不会删除: //x
export function removeComments(oriCode: string) {

    /* eslint-disable max-len */
    const reg = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|`(?:[^\\`]|\\[\s\S])*`|(\/\/\s+[^\r\n\f]+|\/\*[\s\S]+?(?:\*\/|$))/g;
    /* eslint-enable max-len */

    const code = oriCode.replace(reg, (m, comment) => {
        return comment ? '' : m;
    });

    return code;
}
