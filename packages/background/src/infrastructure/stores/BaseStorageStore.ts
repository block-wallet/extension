import log from 'loglevel';
import browser from 'webextension-polyfill';

type StoreValue = Record<string, unknown>;

const lastError = (type: string): void => {
    const error = browser.runtime.lastError;

    if (error) {
        log.error('Store', type, 'runtime.lastError', error.message || error);
    }
};

export default abstract class BaseStorageStore<T> {
    private prefix: string;

    constructor(prefix: string | null) {
        this.prefix = prefix ? `${prefix}:` : '';
    }

    /**
     * Gets the store version or undefined if not set
     */
    public getVersion(): Promise<string | undefined> {
        const key = `${this.prefix}version`;
        return new Promise<string | undefined>((resolve) => {
            browser.storage.local
                .get([key])
                .then((result: StoreValue): void => {
                    lastError('getVersion');
                    key in result
                        ? resolve(result[key] as string)
                        : resolve(undefined);
                });
        });
    }

    /**
     * Sets the store version
     */
    public setVersion(value: string): Promise<void> {
        const key = `${this.prefix}version`;

        return new Promise((resolve) => {
            browser.storage.local.set({ [key]: value }).then((): void => {
                lastError('setVersion');
                resolve();
            });
        });
    }

    public all(update: (key: string, value: T) => void): void {
        browser.storage.local.get(null).then((result: StoreValue): void => {
            lastError('all');

            Object.entries(result)
                .filter(([key]) => key.startsWith(this.prefix))
                .forEach(([key, value]): void => {
                    update(key.replace(this.prefix, ''), value as T);
                });
        });
    }

    public get(_key: string, update: (value: T) => void): void {
        const key = `${this.prefix}${_key}`;

        browser.storage.local.get([key]).then((result: StoreValue): void => {
            lastError('get');

            update(result[key] as T);
        });
    }

    public remove(_key: string, update?: () => void): void {
        const key = `${this.prefix}${_key}`;

        browser.storage.local.remove(key).then((): void => {
            lastError('remove');

            update && update();
        });
    }

    public set(_key: string, value: T, update?: () => void): void {
        const key = `${this.prefix}${_key}`;

        browser.storage.local.set({ [key]: value }).then((): void => {
            lastError('set');

            update && update();
        });
    }
}
