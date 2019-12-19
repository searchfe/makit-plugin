/**
 * @file: env.ts
 * @description 替换 ts 文件中的 process.env.xxx
 */
export function replaceEnv(oriCode: string, env: any) {
    return oriCode.replace(/\bprocess\.env\.([0-9A-Z_]*)\b/g, (m, name) => {
        const val = env[name];
        if (val !== undefined) {
            return JSON.stringify(val);
        }
        return m;
    });
}
