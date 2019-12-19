import {Make} from 'makit/dist/make';
import {make} from 'makit';
import {MakeProcess} from './make-process';

enum Status {
    doing,
    done
}
export class MakeRestrictor {
    private rules: string[] = [];
    private last: Promise<Make>;
    private status: Status;
    private fnList: Function[] = [];
    constructor(private proc: MakeProcess) {
        this.last = new Promise(resolve => {
            this.status = Status.done;
            resolve();
        });
    }
    make(...rules: string[]) {
        const oldRules: string[] = [];
        this.rules.forEach(rule => {
            if (rules.indexOf(rule) === -1) {
                oldRules.push(rule);
            }
        });
        this.rules = [...oldRules, ...rules];
        this.exec();
    }
    exec() {
        switch (this.status) {
            case Status.done:
                this.next();
                break;
            case Status.doing:
                break;
            default:
        }
    }
    next() {
        const rule = this.rules.shift();
        if (rule) {
            this.start();
            this.last = make(rule);
            this.last.then(() => {
                if (this.rules.length) {
                    this.next();
                }
                else {
                    this.end();
                }
            })['catch'](e => {
                console.log(e);
                if (this.rules.length) {
                    this.next();
                }
                else {
                    this.end();
                }
            });
        }
    }
    start() {
        this.proc.start();
        this.status = Status.doing;
    }
    end() {
        this.proc.end();
        this.status = Status.done;
        this.fire();
    }
    async fire() {
        const fn = this.fnList.shift();
        if (fn) {
            await fn();
            await this.fire();
        }
    }
    async whenIdle(fn: any) {
        if (this.status === Status.done) {
            await fn();
        }
        else {
            this.fnList.push(fn);
        }
    }
}
