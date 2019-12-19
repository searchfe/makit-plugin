import * as fs from 'fs';
import * as path from 'path';
import Package from './package';
const SEP: RegExp = new RegExp('\\' + path.sep, 'g');
const defaultPath2url: (url: string) => string = (x: string): string => JSON.stringify(x.replace(/\.js$/, ''));
let singleton: Parser;
export default class Parser {
    modulesPath: string;
    projectPath: string;
    constructor(projectPath: string, modulesPath: string) {
        this.modulesPath = modulesPath || this.resolveModulesPath(projectPath);
        this.projectPath = path.resolve(projectPath);
    }
    resolveModulesPath(projectPath: string) {
        let filepath = this.findPackageJson(projectPath);
        if (!filepath) {
            return path.resolve(projectPath, 'amd_modules');
        }
        let pkg = Package.loadJson(filepath);
        let relativePath = pkg.amdPrefix || 'amd_modules';
        return path.resolve(filepath, '..', relativePath)
    }
    findPackageJson(dir) {
        let pathname = path.resolve(dir, 'package.json');
        if (fs.existsSync(pathname)) {
            return pathname;
        }
        let parent = path.resolve(dir, '..');
        if (parent === dir) {
            return null;
        }
        return this.findPackageJson(parent);
    }
    inModules(fullname: string): boolean {
        return fullname.indexOf(this.modulesPath) === 0;
    }
    isEntryFile(fullname: string): any {
        if (!this.inModules(fullname)) {
            return false;
        }
        if (fullname.indexOf('.js') === -1) {
            return false;
        }
        const relative = fullname.slice(this.modulesPath.length + 1, -3);
        const tokens = relative.split('/');
        if (tokens.length > 2) {
            return false;
        }
        if (tokens.length === 2) {
            return relative[0] === '@' ? relative : false;
        }
        return relative;
    }
    inlinePackage(id: string): string {
        const file = path.resolve(this.modulesPath, id) + '.js';
        const relative = this.relativePath(file);
        return '__inline(' + JSON.stringify(relative) + ');';
    }
    async inlineDependencies(pkgName: string): Promise<string> {
        const pkgPath = path.resolve(this.modulesPath, pkgName);
        const pkg = Package.create(pkgPath);
        const inlines = await pkg.getFiles();
        const text = inlines
            .map(file => this.relativePath(file))
            .map(path => '__inline(' + JSON.stringify(path) + ');')
            .join('\n');
        return text;
    }
    async parse(content: string, path: string, settings: Settings): Promise<string> {
        const pkgName = this.isEntryFile(path);
        if (pkgName) {
            const c = await this.inlineDependencies(pkgName);
            return c + '\n' + content + ';';
        }
        return content
            .replace(
                /__inlinePackage\(['"](.*)['"]\)/g,
                (match, id) => this.inlinePackage(id)
            )
            .replace(
                /__AMD_CONFIG/g,
                () => this.amdConfig(settings.path2url)
            );
    }
    static create(projectPath: string, modulesPath: string): Parser {
        if (!singleton) {
            singleton = new Parser(projectPath, modulesPath);
        }
        return singleton;
    }
    amdConfig(path2url: (url: string) => string): string {
        path2url = path2url || defaultPath2url;
        const lines = Package.getInstalledPackageDirs(this.modulesPath)
            .map(dir => {
                const file = dir + '.js';
                const relativePath = this.relativePath(file);
                const url = path2url(relativePath);
                const id = this.amdID(file);
                return `    "${id}": ${url}`;
            });
        return '{\n' + lines.join(',\n') + '\n}';
    }
    relativePath(fullpath: string): string {
        return fullpath.replace(this.projectPath, '').replace(SEP, '/');
    }
    amdID(fullpath: string): string {
        return fullpath.replace(this.modulesPath, '')
            .replace(/\.js$/, '')
            .replace(SEP, '/')
            .replace(/^\//, '');
    }
}

interface Settings {
    path2url: (url: string) => string;
}
