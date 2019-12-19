/*
 * @Author: qiansc
 * @Date: 2019-04-28 17:25:33
 * @Last Modified by: qiansc
 * @Last Modified time: 2019-10-17 19:16:26
 */
import { traverse, VisitorOption } from 'estraverse';
import { extname } from 'path';
import * as moduleID from './moduleID';
/** 针对Node节点分析所有require依赖 */
export class DependencyAnalyzer {
  private dependencies: IDependency[] = [];
  constructor (
    /** 当前路径 */
    private cwd: string,
    /** 分析的ast node,因为ast库没有支持ts,所以ast类型为any */
    private ast: any,
    /** baseUrl of ModuleID */
    private prefix?: string | undefined,
    private alias?: moduleID.aliasConf[],
    private baseUrl?: string,
    private staticBaseUrl?: string,
    private limitDefineDepth = 1) {}

  /** 进行分析找出require并利用回调处理 最后返回依赖表 */
  public analysis (cb?: analysisCallback): IDependency[] {
      let defineDepth = 0;
      traverse(this.ast, {
          enter: (node, parent) => {
              if (node.type === 'CallExpression' && node.callee && node.callee.name === 'define') {
                  defineDepth++;
              }
              if (defineDepth > this.limitDefineDepth) {
                  return;
              }
              if (matchRequireVariableDeclarator(node)) {
                  const dep = getDependencyFromNode(node);
                  const prefix = dep.moduleID.match(/^\./) === null ? '' : this.prefix;
                  const baseUrl = extname(dep.moduleID) !== '.json' ? (this.baseUrl || this.cwd)
                      : (this.staticBaseUrl || this.baseUrl || this.cwd);
                  dep.moduleID = moduleID.parseBase(
                      baseUrl,
                      moduleID.parseAbsolute(this.cwd, dep.moduleID),
                      prefix, this.alias);
                  const replaced = cb ? cb(dep, node, parent) : undefined;
                  if (node.arguments && node.arguments[0] &&
            node.arguments[0].value &&
            node.arguments[0].value.match(/^\./) !== null) {
                      node.arguments[0].value = dep.moduleID;
                      node.arguments[0].raw = `"${dep.moduleID}"`;
                  }
                  this.dependencies.push(dep);
              }
              if (matchDefineDep(node)) {
                  node.arguments[1].elements.forEach((item, index) => {
                      const prefix = item.value.match(/^\./) === null ? '' : this.prefix;
                      const baseUrl = extname(item.value) !== '.json' ? (this.baseUrl || this.cwd)
                          : (this.staticBaseUrl || this.baseUrl || this.cwd);
                      item.value = moduleID.parseBase(
                          baseUrl,
                          moduleID.parseAbsolute(this.cwd, item.value),
                          prefix, this.alias);
                      node.arguments[1].elements[index] = item;
                  });
              }
          },
          leave: (node) => {
              if (node.type === 'CallExpression' && node.callee && node.callee.name === 'define') {
                  defineDepth--;
              }
          }
      });
      return this.dependencies;
  }
}

interface IDependency {
  name: string;
  value: string;
  moduleID: string;
}

type analysisCallback = (dep: IDependency, node: any, parent: any) => any;

/** 判断当前node节点为require VariableDeclarator 以及 require Literal */
function matchRequireVariableDeclarator (node, dependencies = []) {
    return !!(
        (node.type === 'VariableDeclarator' && node.id && node.id.name !== undefined &&
      node.init && node.init.callee !== undefined && node.init.callee.name === 'require' &&
      node.init.arguments && node.init.arguments[0] && node.init.arguments[0].value !== undefined &&
      dependencies.map((item: any) => item.moduleID).indexOf(node.init.arguments[0].value) === -1) ||
    (node.type === 'CallExpression' && node.arguments[0] && node.arguments[0].type === 'Literal' &&
      node.callee && node.callee.name === 'require')
    );
}
/** 判断当前node节点是否包含require VariableDeclarator 返回去除后正常的declarations */
function hasRequireDeclarations (node, dependencies = []) {
    const notRequireDeclarations: any[] = [];
    let hasRequire = false;
    if (node.type === 'VariableDeclaration' && node.declarations) {
        node.declarations.forEach((element) => {
            if (matchRequireVariableDeclarator(element, dependencies)) {
                hasRequire = true;
            } else {
                notRequireDeclarations.push(element);
            }
        });
    }
    if (hasRequire === false) {
        return false;
    } else {
        return notRequireDeclarations;
    }
}
/**
 * [{"type":"VariableDeclaration","declarations":[{"type":"VariableDeclarator","id":
 * {"type":"Identifier","name":"A"},"init":{"type":"CallExpression","callee":{"type":
 * "Identifier","name":"require"},"arguments":[{"type":"Literal","value":"A","raw":"'A'"}]}}],"kind":"var"}]
 */

/** 从 require VariableDeclarator 节点获取依赖信息 */
function getDependencyFromNode (node): IDependency {
    return {
        moduleID: node.init ? node.init.arguments[0].value : node.arguments[0].value,
        name: node.id ? node.id.name : '',
        value: node.init ? node.init.arguments[0].value : node.arguments[0].value
    };
}

/**
 * require('A');
 * [{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"Identifier",
 * "name":"require"},"arguments":[{"type":"Literal","value":"A","raw":"'A'"}]}}]
 */
function matchDefineDep (node): boolean {
    return !!(node.type === 'CallExpression' && node.callee && node.callee.name === 'define' &&
    node.arguments[1] && node.arguments[1].type === 'ArrayExpression' &&
    node.arguments[1].elements.length > 0);
}
