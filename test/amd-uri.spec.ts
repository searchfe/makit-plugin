import {amdUriReplace} from '../src/plugin/apm/amd-uri';

// @ts-ignore
describe('test amd-uri', () => {
    const mockMake = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('multiple `__getAmdUri`s in the same line', () => {
        amdUriReplace(mockMake, `
        __getAmdUri('./foo.js') // __getAmdUri('./bar.js')
        `, '');
        expect(mockMake).toHaveBeenCalledTimes(2);
        expect(mockMake).toHaveBeenNthCalledWith(1, './foo.js.md5');
        expect(mockMake).toHaveBeenNthCalledWith(2, './bar.js.md5');
    });
});
