import log from 'loglevel';

type StoreValue = Record<string, unknown>;

const lastError = (type: string): void => {
    const error = chrome.runtime.lastError;

    if (error) {
        log.error('Store', type, 'runtime.lastError', error.message || error);
    }
};

/**
 * Checks if chrome.storage.local is available
 * @returns boolean indicating if storage is available
 */
const isStorageAvailable = (): boolean => {
    return !!(chrome && chrome.storage && chrome.storage.local);
};

/**
 * Waits for storage API to become available
 * @param maxAttempts Maximum number of attempts to check
 * @param interval Interval between attempts in ms
 * @returns Promise that resolves when storage is available or rejects after max attempts
 */
const waitForStorage = (maxAttempts = 5, interval = 200): Promise<void> => {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        const checkStorage = () => {
            if (isStorageAvailable()) {
                resolve();
                return;
            }

            attempts++;
            if (attempts >= maxAttempts) {
                reject(
                    new Error(
                        'Chrome storage API not available after multiple attempts'
                    )
                );
                return;
            }

            setTimeout(checkStorage, interval);
        };

        checkStorage();
    });
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
            if (!isStorageAvailable()) {
                log.warn('Storage API not available for getVersion');
                resolve(undefined);
                return;
            }

            chrome.storage.local
                .get([key])
                .then((result: StoreValue): void => {
                    lastError('getVersion');
                    key in result
                        ? resolve(result[key] as string)
                        : resolve(undefined);
                })
                .catch((error) => {
                    log.error('Error in getVersion:', error);
                    resolve(undefined);
                });
        });
    }

    /**
     * Sets the store version
     */
    public setVersion(value: string): Promise<void> {
        const key = `${this.prefix}version`;

        return new Promise((resolve, reject) => {
            if (!isStorageAvailable()) {
                const error = new Error(
                    'Storage API not available for setVersion'
                );
                log.warn(error);
                reject(error);
                return;
            }

            chrome.storage.local
                .set({ [key]: value })
                .then((): void => {
                    lastError('setVersion');
                    resolve();
                })
                .catch((error) => {
                    log.error('Error in setVersion:', error);
                    reject(error);
                });
        });
    }

    public all(update: (key: string, value: T) => void): void {
        if (!isStorageAvailable()) {
            log.warn('Storage API not available for all');
            return;
        }

        chrome.storage.local
            .get(null)
            .then((result: StoreValue): void => {
                lastError('all');

                Object.entries(result)
                    .filter(([key]) => key.startsWith(this.prefix))
                    .forEach(([key, value]): void => {
                        update(key.replace(this.prefix, ''), value as T);
                    });
            })
            .catch((error) => {
                log.error('Error in all:', error);
            });
    }

    public get(_key: string, update: (value: T) => void): void {
        const key = `${this.prefix}${_key}`;

        if (!isStorageAvailable()) {
            log.warn('Storage API not available for get');
            update(undefined as unknown as T);
            return;
        }

        chrome.storage.local
            .get([key])
            .then((result: StoreValue): void => {
                lastError('get');
                update(result[key] as T);
            })
            .catch((error) => {
                log.error('Error in get:', error);
                update(undefined as unknown as T);
            });
    }

    public remove(_key: string, update?: () => void): void {
        const key = `${this.prefix}${_key}`;

        if (!isStorageAvailable()) {
            log.warn('Storage API not available for remove');
            update && update();
            return;
        }

        chrome.storage.local
            .remove(key)
            .then((): void => {
                lastError('remove');
                update && update();
            })
            .catch((error) => {
                log.error('Error in remove:', error);
                update && update();
            });
    }

    public set(_key: string, value: T, update?: () => void): void {
        const key = `${this.prefix}${_key}`;

        if (!isStorageAvailable()) {
            log.warn('Storage API not available for set');
            update && update();
            return;
        }

        chrome.storage.local
            .set({ [key]: value })
            .then((): void => {
                lastError('set');
                update && update();
            })
            .catch((error) => {
                log.error('Error in set:', error);
                update && update();
            });
    }

    /**
     * Waits for storage to be available before executing an operation
     * @returns Promise that resolves when storage is available
     */
    public async ensureStorageAvailable(): Promise<void> {
        if (isStorageAvailable()) {
            return;
        }

        return waitForStorage();
    }
}
