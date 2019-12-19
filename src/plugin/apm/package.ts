import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
const madge = require('madge');

export default class Package {
    meta: any;
    dir: string;
    name: string;
    main: string;
    mainPath: string;
    files: string[];
    static cache:any;
    constructor (meta: any, pkgPath: string) {
        this.meta = meta;
        this.dir = path.dirname(pkgPath);
        this.name = meta.name || this.nameFromDir(this.dir);
        this.main = this.getMain(meta.main, meta.browser);
        this.mainPath = path.resolve(this.dir, this.main);
    }
    getMain (main:string, browser:any):string {
        main = main || 'index.js';
        if (!browser) {
            return main;
        }
        if (typeof browser === 'string') {
            return browser;
        }
        if (browser.main) {
            return browser.main;
        }
        return main;
    }
    nameFromDir (dir:string):string {
        const name = path.basename(dir);
        const parent = path.dirname(dir);
        const scope = path.basename(parent);
        return scope[0] === '@' ? scope + '/' + name : name;
    }
    async getFiles () {
        if (this.files) {
            return this.files;
        }
        const prefix = this.dir + path.sep;
        const deps = await Package.getDependencies(this.mainPath);
        this.files = deps.filter((fullname:string):boolean => fullname.indexOf(prefix) === 0);
        return this.files;
    }
    static async getDependencies (entry:string):Promise<string[]> {
        const graph = await madge(entry);
        const dirname = path.dirname(entry);
        return Object.keys(graph.tree).map((file):string => path.resolve(dirname, file));
    }
    static getInstalledPackageDirs (modulesPath:string):string[] {
        const files = glob.sync('/{@*/*,*}/package.json', { root: modulesPath });
        return files.map(file => path.dirname(file));
    }
    static create (dir:string): Package {
        const pkgPath = path.resolve(dir, 'package.json');
        const cache = Package.cache;
        if (cache[pkgPath]) {
            return cache[pkgPath];
        }
        const meta = Package.loadJson(pkgPath);
        cache[pkgPath] = new Package(meta, pkgPath);
        return cache[pkgPath];
    }
    static loadJson (file:string):any {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
}
Package.cache = {};
