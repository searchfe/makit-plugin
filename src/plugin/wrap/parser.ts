/*
 * @Author: qiansc
 * @Date: 2019-04-28 14:43:21
 * @Last Modified by: qiansc
 * @Last Modified time: 2019-11-28 15:47:41
 */
import { generate } from 'escodegen';
import { parse, parseScript } from 'esprima';
import { traverse } from 'estraverse';
import { existsSync } from 'fs';
import { AsyncAnalyzer } from './async-analyzer';
import { DependencyAnalyzer } from './dependency-analyzer';
import { include } from './filter';
import { parseAbsolute, parseBase, aliasConf } from './moduleID';
import { basename, dirname, extname, resolve } from 'path';
const md5File = require('md5-file');

export class Parser {
  private cwd: string;
  private ast;
  private myModuleId: string;
  private parseDefine;
  private dependences: string[];
  constructor (
    private contents: Buffer,
    private filePath: string,
    private root: string,
    private prefix: string,
    private alias?: aliasConf[],
    private staticBaseUrl?: string) {
      this.cwd = dirname(filePath);
      this.parse();


      this.dependences = [];
      this.parseDefine = 0;
  }
  public getContent () {
      return this.contents;
  }
  public getModuleId () {
      return this.myModuleId;
  }
  public getDependences () {
      return Array.from(new Set(this.dependences));
  }
  public isHasObj (arr, val) {
      let flag = false;
      if (!arr || arr.length === 0) { return false; }
      arr.forEach((element) => {
          if (JSON.stringify(element).indexOf(JSON.stringify(val)) !== -1) {
              flag = true;
          }
      });
      return flag;
  }
  public hook (hookOption: HookOption = {}) {
      /** 生成的ModuleId md5后缀来避免其他模块引用 @molecule/toptip2_134dfas */
      this.parseDefine = 0;
      let md5Value: string = '';

      if (hookOption.useMd5 === true || (hookOption.useMd5 && hookOption.useMd5.useMd5)) {
          const exlude = hookOption.useMd5.exlude; // 要被排除的文件

          if (!include(resolve(this.filePath), exlude, this.root)) {
              // 不在md5排除名单中
              try {
                  md5Value = '_' + md5File.sync(this.filePath.replace('.js', '.ts')).slice(0, 7);
              } catch (e) {
                  console.log(e);
              }
          }
      }
      // console.log(this.contents.toString());
      traverse(this.ast, {
          enter: (node) => {
              if (node.type === 'CallExpression') {
                  // 如果是define
                  if (node.callee && node.callee.name === 'define') {
                      this.parseDefine++;
                      if (this.parseDefine === 1) {
                          // 首参数是function，推入依赖数组
                          if (node.arguments[0].type === 'FunctionExpression') {
                              node.arguments.unshift(
                                  { type: 'ArrayExpression', elements: [] }
                              );
                          }
                          // 首参数推入moduleId => define("@molecule/toptip/main",xxxx)
                          if (node.arguments[0].type === 'ArrayExpression') {
                              node.arguments.unshift(
                                  {
                                      type: 'Literal',
                                      value: parseBase(this.root, this.filePath, this.prefix, this.alias) + md5Value
                                  }
                              );
                          } else if (node.arguments[0].type === 'ObjectExpression' || node.arguments[0].type === 'Identifier') {
                              node.arguments.unshift({ type: 'ArrayExpression', elements: [] });
                              node.arguments.unshift({
                                  type: 'Literal',
                                  value: parseBase(this.root, this.filePath, this.prefix, this.alias) });
                          } else if (node.arguments[0].type === 'Literal') {
                              const moduleId = node.arguments[0].value;
                              if (moduleId.split('/').pop() === basename(this.filePath, extname(this.filePath))) {
                                  const prefix = moduleId.match(/^\./) === null ? '' : this.prefix;
                                  node.arguments[0].value = parseBase(this.root, this.filePath, prefix, this.alias);
                              }
                          }
                          this.myModuleId = node.arguments[0].value;
                          const analyzer = new DependencyAnalyzer(
                              this.cwd,
                              node,
                              this.prefix,
                              this.alias,
                              this.root,
                              this.staticBaseUrl);

                          const deps = analyzer.analysis(
                              (dep, requireNode, parent) => {
                                  // requireNode.id.name = {type};
                                  // console.log('analyzer', dep, requireNode);
                              }
                          );

                          // 第二参数是依赖数组 => define("", ['require', 'exports', 'md5-file'])
                          if (node.arguments[1].elements) {
                              node.arguments[1].elements.forEach((element, index) => {
                                  const valueString = element.value;
                                  /** depPath: 实际依赖的相对路径文件。如果是node_module就为空 */
                                  const depPath = parseAbsolute(dirname(this.filePath), valueString + '.ts');
                                  if (existsSync(depPath)) {
                                      let md5 = '';
                                      if (hookOption.useMd5 === true ||
                                        (hookOption.useMd5 && hookOption.useMd5.useMd5)) {
                                          const exlude = hookOption.useMd5.exlude; // 要被排除的文件

                                          if (!include(resolve(this.filePath), exlude, this.root)) {
                                              // 不在md5排除名单中
                                              try {
                                                  md5 = '_' + md5File.sync(depPath).slice(0, 7);
                                              } catch (e) {
                                                  console.log(e);
                                              }
                                          }
                                      }
                                      // moduleid 示例：@molecule/toptip/main_dc85e717d6352fa285bc70bc2d1d3595
                                      const moduleid = parseBase(this.root, depPath, this.prefix, this.alias) + md5;
                                      console.log(moduleid);
                                      node.arguments[1].elements[index].value = moduleid;
                                  }
                              });
                          }

                          if (node.arguments[1] && node.arguments[1].elements &&
                !this.isHasObj(node.arguments[1].elements, 'require')) {
                              node.arguments[1].elements.unshift({ type: 'Literal', value: 'require' });
                          }
                          if (node.arguments[2] && node.arguments[2].params) {
                              if (!this.isHasObj(node.arguments[2].params, 'require')) {
                                  node.arguments[2].params.unshift({ type: 'Identifier', name: 'require' });
                              }
                              node.arguments[2].params.forEach((item, index) => {
                                  if (item.name === 'exports') {
                                      node.arguments[1].elements[index] = { type: 'Literal', value: 'exports' };
                                  } else if (item.name === 'module') {
                                      node.arguments[1].elements[index] = { type: 'Literal', value: 'module' };
                                  }
                              });
                          }
                          deps.forEach((dep) => {
                              if (node.arguments[1] && node.arguments[1].elements &&
                  node.arguments[1].elements.map((e) => e.value).indexOf(dep.moduleID) < 0) {
                                  node.arguments[1].elements.push({ type: 'Literal', value: dep.moduleID });
                                  // factory函数的参数中推入依赖对应的变量名
                                  // if (dep.name) {
                                  //   node.arguments[2].params.push({ type: 'Identifier', name: dep.name });
                                  // }
                                  this.dependences.push(dep.moduleID);
                              }
                          });
                          if (hookOption.removeModuleId) {
                              node.arguments.shift();
                          }
                      }
                  }
                  if (node.callee && node.callee.name === 'require' && this.parseDefine < 2) {
                      const firstArg = node.arguments[0];
                      // 首参数是依赖数组，推入moduleId
                      if (firstArg.type === 'ArrayExpression') {
                          firstArg.elements.map((element) => {
                              if (element.value && element.value.match(/^\.\.?\//) !== null) {
                                  element.value = parseBase(
                                      this.root,
                                      parseAbsolute(this.cwd, element.value),
                                      this.prefix,
                                      this.alias);
                                  element.raw = `"${element.value}"`;
                                  this.dependences.push(element.value);
                              }
                          });
                      }
                      if (firstArg.type === 'Literal') {
                          if (firstArg.value && firstArg.value.match(/^\.\.?\//) !== null) {
                              const baseUrl = extname(firstArg.value) !== '.json' ? this.root : this.staticBaseUrl || this.root;
                              firstArg.value = parseBase(
                                  baseUrl,
                                  parseAbsolute(this.cwd, firstArg.value),
                                  this.prefix,
                                  this.alias);
                              firstArg.raw = `"${firstArg.value}"`;
                              this.dependences.push(firstArg.value);
                          }
                      }
                  }
              }
              return node;
          },
          leave: (node) => {
              if (node.type === 'CallExpression') {
                  // 如果是define
                  if (node.callee && node.callee.name === 'define') {
                      this.parseDefine--;
                  }
              }
              // const aa = new AsyncAnalyzer(
              //   this.cwd,
              //   node,
              //   this.root,
              // );
              // aa.analysis();
          }
      });
      this.contents = generate(this.ast);
      return this;
  }
  private parse () {
      this.ast = parseScript(this.contents.toString());
  }

  /**
   * define(function() {});
   */
  private isSingelFunction () {
      // do nothing
  }

    /**
   * define([...], function() {});
   */

    /**
   * define('XXX', [...], function() {});
   */
}

interface HookOption {
  removeModuleId?: boolean;
  useMd5?: any;
}
