import { on, off, DirectedGraph } from 'makit';
import stdout  from './stdout';
const chalk = require('chalk');

interface MakeProcessOption {
    estimatedTime?: number
}
const tty = process.stdout.isTTY;

const cwd =  process.cwd();

export class MakeProcess {
    public sum = 0;
    public succ = 0;
    public skip = 0;
    private started = false;
    private prepareFn: any;
    private makeFn: any;
    private skipFn: any;
    private time: number;
    private pct: number;
    private workStatus: string = '';
    private currentTarget: string = '';
    private graph: DirectedGraph<string>;
    private moment: number[] = [];

    constructor(private option: MakeProcessOption = {}) {
        const self = this;
        this.prepareFn = (args) => {
            if (!this.started) return;
            self.prepareHandler(args);
        }
        this.makeFn = (args) => {
            if (!this.started) return;
            self.makeHandler(args);
        }
        this.skipFn = (args) => {
            if (!this.started) return;
            self.skipHandler(args);
        }
    }

    start() {
        this.time = new Date().getTime();
        this.pct = 0.1;
        this.skip = 0;
        this.sum = 0;
        this.succ = 0;
        this.moment = [];
        if (this.started) {
            return;
        }
        this.started = true;
        console.log('\n');

        on('making', this.prepareFn);
        on('maked', this.makeFn);
        on('skip', this.skipFn);

    }

    prepareHandler({target, parent, graph}) {
        this.sum ++;
        this.cal();
        this.workStatus = 'making';
        this.currentTarget = target;
        this.graph = graph;
        if (tty) {
            stdout.bottom(this.dashboard());
        }
    }
    makeHandler({target, parent, graph}) {
        this.succ ++;
        this.cal();
        this.workStatus = 'maked';
        this.currentTarget = target;
        this.graph = graph;
        if (tty) {
            stdout.bottom(this.dashboard());
        } else if (graph) {
            stdout.log(`[${this.workStatus}] ` + graph.getSinglePath(target).reverse().join(' -> '))
        }
    }
    skipHandler({target, parent, graph}) {
        this.skip ++;
        this.cal();
        this.workStatus = 'skipped';
        this.currentTarget = target;
        this.graph = graph;
        if (tty) {
            stdout.bottom(this.dashboard());
        } else if (graph) {
            stdout.log(`[${this.workStatus}] ` + graph.getSinglePath(target).reverse().join(' -> '))
        }
    }
    cal() {
        const pct = Math.floor(this.succ / (this.sum -this.skip) * 10000) / 100;
        this.pct = Math.max(this.pct, pct);
    }
    dashboard() {
        const dash: string[] = [];
        let cost = Math.round((new Date().getTime() - this.time) / 1000);
        let info  = `♨ ${this.precent()}${complete(cost + 's', 5)} ${complete(this.resetTime(), 7)} `
            +`${complete(this.makeInfo(), 18)}          `;
        info = chalk`{greenBright.bold ${info}}`;
        dash.push(info);
        dash.push(this.tree());
        return dash.join('\n');
    }

    precent() {
        return `${complete(this.pct.toFixed(2), 6, ' ')}% `;
    }
    makeInfo() {
        return `${this.succ}/${this.skip}/${this.sum}`;
    }

    resetTime() {
        if (this.pct >= 100) {
            return '0s'
        }
        const all = this.succ + this.skip;
        let cost = new Date().getTime() - this.time;
        let estimate =  Math.round(cost * 0.001 * (this.sum - all) / Math.max(this.succ, 1));
        estimate = Math.max(1, estimate);
        this.moment.push(estimate);
        if (this.moment.length > 100) {
            this.moment.shift();
        }
        let rs = Math.max(estimate , (sum(this.moment) / this.moment.length));
        if (this.option.estimatedTime && rs > this.option.estimatedTime) {
            rs = this.option.estimatedTime + Math.pow(rs, 0.5);
        } else if (this.option.estimatedTime && this.pct < 40 && this.option.estimatedTime * this.pct > rs) {
            rs = this.option.estimatedTime + Math.pow(rs, 0.5);
        }
        return Math.floor(rs) + 's';
    }

    tree() {
        if (!this.graph) {
            return '';
        }
        let tree: string[] = this.graph.getSinglePath(this.currentTarget) as string[];
        tree.reverse();
        tree = tree.map((str, index) => {
            str = str.replace(cwd + '/', '');
            let prefix = '';
            if (index === tree.length - 1) {
                prefix = "└─"
            } else {
                prefix = "└┬"
            }
            return new Array(index + 1).join(' ') + prefix + ' ' + str;
        });
        return chalk['gray'](tree.join('\n'));
    }
    end() {
        /** makit 还没实现off evt 暂时不能移除 */
        off('making', this.prepareFn);
        off('maked', this.makeFn);
        off('skip', this.skipFn);
        this.pct = 100;
        this.skip = 0;
        this.sum = 0;
        this.succ = 0;
        this.dashboard();
        process.stdout.write('\n');
        this.started = false;
    }
}

function complete(str: string | number, len: number, fill: string = ' ', prefix: boolean = true) {
    const fix = new Array(Math.max(len - str.toString().length, 0)).join(fill);
    return  prefix? fix + str : str + fix;
}

function sum(arr) {
    return arr.reduce(function(prev, curr, idx, arr){
      return prev + curr;
    });
  }
