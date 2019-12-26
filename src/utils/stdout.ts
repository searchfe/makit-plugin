import * as readline from 'readline';

enum outType {
    console,
    stdout
}

class Stdout {
    public log = console.log;
    public warn = console.warn;
    public error = console.error;
    public ustr: string;
    public enabled = false;
    private type: outType = outType.console;
    constructor() {}
    ulog(...args) {
        this.prepareConsole();
        this.type = outType.console;
        this.log(...args);
    }
    uwarn(...args) {
        this.prepareConsole();
        this.type = outType.console;
        this.warn(...args);
    }
    uerror(...args) {
        this.prepareConsole();
        this.type = outType.console;
        this.error(...args);
    }
    prepareConsole() {
        if (this.type === outType.stdout) {
            this.back();
            readline.clearLine(process.stdout, 0);
        }
        this.ustr = '';
    }
    bottom(...str: string[]) {
        if (!this.enabled) {
            return;
        }
        this.back();
        const newStr: string[] = [];
        str.join('\t').split('\n').forEach(str => {
            newStr.push(str.substring(0, process.stdout.columns - 20));
        });
        this.ustr = newStr.join('\n');
        process.stdout.write(this.ustr, 'utf-8');
        this.type = outType.stdout;
    }
    back(line?: number) {
        let ln = line;
        if (!ln) {
            if (this.ustr) {
                // 逐行计算高度
                let l = 0;
                this.ustr.split('\n').forEach(str => {
                    l += Math.ceil(str.length / process.stdout.columns);
                });
                ln = l;
            }
            else {
                ln = 0;
            }
        }

        for (let i = 0; i < ln; i++) {
            readline.cursorTo(process.stdout, 0);
            readline.clearLine(process.stdout, 0);
            if (i > 0) {
                readline.moveCursor(process.stdout, 0, -1);
            }
        }
    }
    enable() {
        this.enabled = true;
        console.log = (...args) => {
            this.ulog(...args);
        };
        console.warn = (...args) => {
            this.uwarn(...args);
        };
        console.error = (...args) => {
            this.uerror(...args);
        };
    }
    disable() {
        this.back();
        this.enabled = false;
        console.log = this.log;
        console.warn = this.warn;
        console.error = this.error;
    }
}

const stdout = new Stdout();

export default stdout;

export function enable() {
    stdout.enable();
}

export function disable() {
    stdout.disable();
}
