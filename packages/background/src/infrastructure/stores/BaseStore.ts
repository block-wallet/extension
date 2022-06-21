import { Mutex } from 'async-mutex';
import { BaseController } from '../BaseController';

// Alias class with same behavior as BaseController
export class BaseStore<S> extends BaseController<S> {}

export class BaseStoreWithLock<S> extends BaseStore<S> {
    private _lock: Mutex;

    constructor(state?: S) {
        super(state);
        this._lock = new Mutex();
    }

    /**
     * It acquires the store mutex lock
     *
     * @returns The releaseLock function
     */
    public async getStoreMutexLock(): Promise<{
        releaseMutexLock: () => void;
    }> {
        const releaseMutexLock = await this._lock.acquire();
        return { releaseMutexLock };
    }
}
