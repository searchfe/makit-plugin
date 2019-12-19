import { resolve, dirname } from 'path';

export function absolutize(path: string, filePath: string, basePath: string) {
    let newPath;
    if (path.match(/^\./)) {
        newPath = resolve(dirname(filePath), path);
    } else {
        newPath = resolve(resolve(basePath, path));
    }
    return newPath;
}
