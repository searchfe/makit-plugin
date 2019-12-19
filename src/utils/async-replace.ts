const DO_NOTHING = () => {};

// function makePromiseSeq(promiseFn: AsyncFn) {
//     let top = Promise.resolve();
//     return (match: string, ...args: string[]) => {
//         top = top
//             .catch(DO_NOTHING)
//             .then(() => promiseFn(match, ...args));
//         return top;
//     };
// }

export async function replace(str: string, regex: RegExp, asyncFn: AsyncFn, notifyCb = DO_NOTHING) {
    const promises: Promise<string>[] = [];
    str.replace(regex, (match, ...args) => {
        const promise: Promise<string> = asyncFn(match, ...args);
        promises.push(promise);
        promise
            .then(notifyCb)
            .catch(DO_NOTHING);
        return match;
    });
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift() as string);
}

// function replaceSeq(str: string, regex: RegExp, asyncFn: AsyncFn, notifyCb = DO_NOTHING) {
//     const asyncFnSeq = makePromiseSeq(asyncFn);
//     return replace(str, regex, asyncFnSeq, notifyCb);
// }

type AsyncFn =  (match: string, ...groups: string[]) => Promise<string>;
