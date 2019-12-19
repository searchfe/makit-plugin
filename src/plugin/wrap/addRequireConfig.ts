import { File } from 'gulp-util';
import { basename, relative, resolve } from 'path';
import { Transform } from 'readable-stream';

/** 解析所有文件的moduleID, 生成config后插到入口文件的头部 */
export function addRequireConfig (option: OptionType) {
    const mainJs = option.mainJs || 'main.js';
    const pathConfig: object = {};
    let mainFile;
    return new Transform({
        objectMode: true,
        // 从每个文件中读取moduleId, 保存到pathConfig对象中。
        transform: (file: File, enc, callback) => {
            const fileName = basename(file.path);
            // 主入口定义的moduleId不需要写到config里面
            if (fileName !== mainJs) {
                const touchModuleId = file.contents.toString().match(/^define\(["']([0-9a-zA-Z@_\-/]+)["']/);
                const moduleId = touchModuleId && touchModuleId[1];
                const relativePath = relative(option.sourceDir, file.path);
                if (moduleId) {
                    // {'@molecule/a/xxx': '//m.baidu.com/se/static/molecules/a/b/xx}
                    pathConfig[moduleId] = option.deloyDir + relativePath.replace(/.js$/, '');
                }
            } else {
                mainFile = file;
            }
            callback(null, file);
        },
        // 将pathConfig对象中的moduleId打印成config文件，塞入主文件main.js
        flush (callback) {
            const finalConfig = 'require.config({paths:' + JSON.stringify(pathConfig) + '});\n';
            mainFile.contents = Buffer.from(finalConfig + mainFile.contents.toString());
            this.push(mainFile);
            callback();
        }
    });
}
interface OptionType {
    mainJs?: string;
    /** 线上部署地址 如/se/static/molecules/toptip/ */
    deloyDir: string;
    /** 编译前脚本路径，用于计算文件相对位置。得出'./static/script/a.js'后与deployDir拼接 */
    sourceDir: string;
}
