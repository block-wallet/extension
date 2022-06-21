/* eslint-disable @typescript-eslint/no-explicit-any */
export const reverse = (a: any[]): any[] => {
    const result = [];
    for (let i = a.length - 1; i >= 0; i--) {
        result.push(a[i]);
    }

    return result;
};
