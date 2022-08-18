import log from 'loglevel';

type StoreValue = Record<string, unknown>;

const lastError = (type: string): void => {
    const error = chrome.runtime.lastError;

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
            chrome.storage.local.get([key], (result: StoreValue): void => {
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
            chrome.storage.local.set({ [key]: value }, (): void => {
                lastError('setVersion');
                resolve();
            });
        });
    }

    public all(update: (key: string, value: T) => void): void {
        chrome.storage.local.get(null, (result: StoreValue): void => {
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

        chrome.storage.local.get([key], (result: StoreValue): void => {
            lastError('get');

            update(result[key] as T);
        });
    }

    public remove(_key: string, update?: () => void): void {
        const key = `${this.prefix}${_key}`;

        chrome.storage.local.remove(key, (): void => {
            lastError('remove');

            update && update();
        });
    }

    public set(_key: string, value: T, update?: () => void): void {
        const key = `${this.prefix}${_key}`;

        chrome.storage.local.set({ [key]: value }, (): void => {
            lastError('set');

            update && update();
        });
    }
}
