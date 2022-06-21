/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { sha256 } from 'ethereumjs-util';

export const SALT = chrome.runtime.id;

export function Hash(
    target: any,
    propertyKey: string,
    parameterIndex: number
): void {
    Hasher.registerToHash(target, propertyKey, parameterIndex);
}

export function Hasheable(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
): void {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
        if (!Hasher.performHashing(target, propertyKey, args)) {
            return;
        }
        const result = originalMethod.apply(this, args);
        return result;
    };
}

export class Hasher {
    private static toHashMap: Map<any, Map<string, number[]>> = new Map();

    static registerToHash(
        target: any,
        methodName: string,
        paramIndex: number
    ): void {
        let paramMap: Map<string, number[]> = this.toHashMap.get(target)!;
        if (!paramMap) {
            paramMap = new Map();
            this.toHashMap.set(target, paramMap);
        }
        let paramIndexes: number[] = paramMap.get(methodName)!;
        if (!paramIndexes) {
            paramIndexes = [];
            paramMap.set(methodName, paramIndexes);
        }
        paramIndexes.push(paramIndex);
    }

    static performHashing(
        target: any,
        methodName: string,
        paramValues: any[]
    ): any[] {
        const toHashMap: Map<string, number[]> = this.toHashMap.get(target)!;
        if (!toHashMap) {
            return paramValues;
        }
        const paramIndexes: number[] = toHashMap.get(methodName)!;
        if (!paramIndexes) {
            return paramValues;
        }
        for (const [index, paramValue] of paramValues.entries()) {
            if (paramIndexes.indexOf(index) != -1) {
                if (typeof paramValue !== 'undefined') {
                    paramValues[index] = sha256(
                        Buffer.from(paramValue + SALT)
                    ).toString();
                }
            }
        }
        return paramValues;
    }
}
