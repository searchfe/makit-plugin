import {existsSync, readFileSync} from 'fs';
import {resolve} from 'path';
import {make} from 'makit';
import * as chokidar from 'chokidar';
import {pushFactory} from '../plugin/push/index';
import {RecipeImpl, pickConfig} from '../utils/recipe-factory';
import {MakeProcess} from '../utils/make-process';
import stdout from '../utils/stdout';
import {MakeRestrictor} from '../utils/make-restrictor';

const chalk = require('chalk');

const ignored = /^\./;

const devConfig = resolve(`${process.cwd()}/dev.config.js`);
const config = existsSync(devConfig) ? require(devConfig) : {};
const push = pushFactory({
    'onEnd': (totalCount, successCount, failCount) => {
        const str = `✈ deploy end [ total ${totalCount}, success ${successCount}, fail ${failCount} ]`;
        const info = chalk`{greenBright.bold ${str}}`;
        stdout.bottom('\n' + info);
    },
    'onProcess': ({path, to}) => {
        const info: string[] = [chalk`{greenBright.bold ✈ deploying ...}`];
        info.push(chalk.gray('└┬ ' + to));
        info.push(chalk.gray(' └─ ' + path.replace(process.cwd() + '/', '')));
        stdout.bottom(info.join('\n'));
    },
    ...config
});

interface DeployRecipeOption{
    to: string
}
const proc = new MakeProcess({'estimatedTime': 60});
const restrictor = new MakeRestrictor(proc);

export const deploy: RecipeImpl<DeployRecipeOption, undefined> = ({dep, to}, config, done) => {
    push(dep, to, dep, done);
};

export function watchDeploy(outputFolder: string, deployConf: any) {
    // const conf = pickConfig(configs, path, '**/', '**');
    return ctx => {
        console.log('inside watchdeploy');
        chokidar
            .watch(outputFolder, {ignored})
            .on('add', path => {
                const {to} = pickConfig(deployConf, path, '**/');
                if (to) {
                    restrictor.whenIdle(() => {
                        push(path, to, path);
                    });
                }
            })
            .on('change', path => {
                const {to} = pickConfig(deployConf, path, '**/');
                if (to) {
                    restrictor.whenIdle(() => {
                        push(path, to, path);
                    });
                }
            })
            .on('error', error => console.error('Error while watching', error));
    };
}

export interface WatchToBuildOption{
    src: string
    rule?: string
}

export interface WatchToBuildConfig{
    file: string
    onAdd?: string | string[]
    onChange: string | string[]
}

export const watchToBuild = ({src, rule}: WatchToBuildOption, configs: WatchToBuildConfig[]) => {
    return async ctx => {
    // 既然要发布， 就提前检查 receiver
        if (!config.receiver) {
            throw new Error('dev.config.js - receiver is required!');
        }

        // 先编译一把
        proc.start();
        const taskName = rule ? rule : 'build';
        await make(taskName);
        proc.end();

        chokidar
            .watch(src, {ignored, 'ignoreInitial': true})
            .on('add', async path => {
                const conf = pickConfig(configs, path, '**/', '**');
                if (conf.onAdd !== undefined) {
                    const addRules = typeof conf.onAdd === 'string' ? [conf.onAdd] : conf.onAdd;
                    restrictor.make(...addRules);
                // proc.start();
                // for(let i = 0; i < addRules.length; i++ ) {
                //     await make(addRules[i]);
                // }
                // proc.end();
                }
            })
            .on('change', async path => {
                console.log('rebuilding', path);
                const conf = pickConfig(configs, path, '**/', '**');
                if (conf.onChange !== undefined) {
                    const changeRules = typeof conf.onChange === 'string' ? [conf.onChange] : conf.onChange;
                    restrictor.make(...changeRules);
                // proc.start();
                // for(let i = 0; i < changeRules.length; i++ ) {
                //     await make(changeRules[i]);
                // }
                // proc.end();
                }
            })
            .on('error', error => console.error('Error while watching', error));
    };
};
