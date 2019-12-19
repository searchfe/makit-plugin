import { replace } from '../../utils/async-replace';
import { getHashFile } from '../hash';

type Make = (str: string) => Promise<number>;

export async function amdUriReplace(make: Make, content: string, projectFloder: string) {
    const reg = /__getAmdUri\s*\(\s*('|")(.+)\1\s*\)/ig;
    return await replace(content, reg, async (match: string, quote: string, value: string) => {
        await make (projectFloder + value + '.md5').catch((err: Error) => {
            console.log(err);
            throw new Error(`ERROR 0x006: Make error when amd-uri make : ${projectFloder + value}`);
        });
        const filePath = projectFloder + value;
        const hashFile = getHashFile(filePath);
        const hash = hashFile.md5;
        if (hashFile.md5 === '') {
            throw new Error(`ERROR 0x007: Hash Error when amd-uri: ${value}`);
        }
        const tmpPath = '.' + value.replace('.js', '_').replace('.css', '_');
        return quote + tmpPath + hash + quote;
    });
}
