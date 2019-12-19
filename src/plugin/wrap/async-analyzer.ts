/*
 * @Author: qiansc
 * @Date: 2019-04-27 14:21:32
 * @Last Modified by: qiansc
 * @Last Modified time: 2019-10-17 19:14:56
 */
import { traverse, VisitorOption } from 'estraverse';
import * as moduleID from './moduleID';

/** 针对Node节点分析所有require依赖 */
export class AsyncAnalyzer {
    constructor (
    /** 当前路径 */
    private cwd: string,
    /** 分析的ast node,因为ast库没有支持ts,所以ast类型为any */
    public ast: any,
    /** baseUrl of ModuleID */
    private baseUrl?: string,
    private limitDefineDepth = 1
    ) {}

    /** 进行分析找出require并利用回调处理 最后返回依赖表 */
    public analysis () {
        let defineDepth = 0;
        traverse(this.ast, {
            enter: (node, parent) => {
                if (node.type === 'CallExpression' && node.callee && node.callee.name === 'define') {
                    defineDepth++;
                }
                if (defineDepth > this.limitDefineDepth) {
                    return;
                }
                if (matchAsyncRequireCallExpression(node)) {
                    node.arguments[0].elements.forEach((element, index) => {
                        /** 如果是动态require就不会有value require(mod) */
                        if (element.value) {
                            element.value = moduleID.parseBase(
                                this.baseUrl || this.cwd, moduleID.parseAbsolute(this.cwd, element.value));
                            delete element.raw;
                        }
                    });
                }
            },
            leave: (node) => {
                if (node.type === 'CallExpression' && node.callee && node.callee.name === 'define') {
                    defineDepth--;
                }
            }
        });
    }
}

/** 判断当前node节点为require VariableDeclarator */
function matchAsyncRequireCallExpression (node) {
    return !!(
        node.type === 'CallExpression' &&
    node.callee !== undefined && node.callee.name === 'require' &&
    node.arguments && node.arguments[0] && node.arguments[0].type === 'ArrayExpression' &&
    node.arguments[0].elements && node.arguments[0].elements.value
    );
}
/**
   * [{"type":"VariableDeclaration","declarations":[{"type":"VariableDeclarator","id":
   * {"type":"Identifier","name":"A"},"init":{"type":"CallExpression","callee":{"type":
   * "Identifier","name":"require"},"arguments":[{"type":"Literal","value":"A","raw":"'A'"}]}}],"kind":"var"}]
   */
