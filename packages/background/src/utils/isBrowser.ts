/**
 * isBrowser
 *
 * @returns Whether it is a browser environment or not
 */
export const isBrowser = (): boolean => typeof window !== 'undefined';
