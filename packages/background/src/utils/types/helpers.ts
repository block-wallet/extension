/* eslint-disable @typescript-eslint/ban-types */
/**
 * It returns a union of every T keys
 */
export type ValuesOf<T> = T[keyof T];

export type NonObjectKeysOf<T> = {
    [K in keyof T]: T[K] extends Array<any>
        ? K
        : T[K] extends object
        ? never
        : K;
}[keyof T];

export type ObjectValuesOf<T extends Object> = Exclude<
    Exclude<Extract<ValuesOf<T>, object>, never>,
    Array<any>
>;

export type UnionToIntersection<U> = (
    U extends any ? (k: U) => void : never
) extends (k: infer I) => void
    ? I
    : never;

/**
 * It flattens an object one level down
 */
export type Flatten<T extends Object> = Pick<T, NonObjectKeysOf<T>> &
    UnionToIntersection<ObjectValuesOf<T>>;

export type Full<T> = {
    [P in keyof T]-?: T[P];
};

export type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};

/**
 * Requires the given prop of an object
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
