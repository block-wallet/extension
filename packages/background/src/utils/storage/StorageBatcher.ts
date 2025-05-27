import log from 'loglevel';

export type StorageType = 'local' | 'session';

interface BatchedOperation {
    type: 'get' | 'set' | 'remove';
    keys?: string[];
    data?: Record<string, any>;
    storageType: StorageType;
}

interface PendingBatch {
    operations: BatchedOperation[];
    resolve: (result: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
}

/**
 * StorageBatcher optimizes chrome.storage API calls by batching multiple operations
 * together and providing caching capabilities for frequently accessed data.
 */
export class StorageBatcher {
    private static instance: StorageBatcher;
    private pendingBatches = new Map<StorageType, PendingBatch[]>();
    private cache = new Map<string, { value: any; timestamp: number; ttl: number }>();
    private batchTimeout = 10; // ms - very short timeout for immediate batching
    private maxBatchSize = 50; // max operations per batch

    private constructor() {
        this.pendingBatches.set('local', []);
        this.pendingBatches.set('session', []);
    }

    public static getInstance(): StorageBatcher {
        if (!StorageBatcher.instance) {
            StorageBatcher.instance = new StorageBatcher();
        }
        return StorageBatcher.instance;
    }

    /**
     * Checks if chrome.storage is available
     */
    private isStorageAvailable(storageType: StorageType): boolean {
        if (storageType === 'session') {
            return !!(chrome?.storage?.session);
        }
        return !!(chrome?.storage?.local);
    }

    /**
     * Gets the appropriate storage API
     */
    private getStorageApi(storageType: StorageType) {
        return storageType === 'session' ? chrome.storage.session : chrome.storage.local;
    }

    /**
     * Creates a cache key for the given storage key and type
     */
    private getCacheKey(key: string, storageType: StorageType): string {
        return `${storageType}:${key}`;
    }

    /**
     * Checks if cached value is still valid
     */
    private isCacheValid(cacheKey: string): boolean {
        const cached = this.cache.get(cacheKey);
        if (!cached) return false;

        return Date.now() - cached.timestamp < cached.ttl;
    }

    /**
     * Batched get operation with caching
     */
    public async get(
        keys: string | string[],
        storageType: StorageType = 'local',
        cacheTtl = 5000 // 5 second default cache
    ): Promise<Record<string, any>> {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        const result: Record<string, any> = {};
        const keysToFetch: string[] = [];

        // Check cache first
        for (const key of keyArray) {
            const cacheKey = this.getCacheKey(key, storageType);
            if (this.isCacheValid(cacheKey)) {
                result[key] = this.cache.get(cacheKey)!.value;
            } else {
                keysToFetch.push(key);
            }
        }

        // If all keys were cached, return immediately
        if (keysToFetch.length === 0) {
            return result;
        }

        // Fetch remaining keys
        try {
            if (!this.isStorageAvailable(storageType)) {
                throw new Error(`${storageType} storage not available`);
            }

            const storageApi = this.getStorageApi(storageType);
            const storageResult = await storageApi.get(keysToFetch);

            // Cache and merge results
            for (const key of keysToFetch) {
                const value = storageResult[key];
                const cacheKey = this.getCacheKey(key, storageType);

                // Cache the result
                this.cache.set(cacheKey, {
                    value,
                    timestamp: Date.now(),
                    ttl: cacheTtl
                });

                result[key] = value;
            }

            return result;
        } catch (error) {
            log.error('StorageBatcher.get error:', error);
            throw error;
        }
    }

    /**
     * Batched set operation
     */
    public async set(
        data: Record<string, any>,
        storageType: StorageType = 'local'
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.isStorageAvailable(storageType)) {
                reject(new Error(`${storageType} storage not available`));
                return;
            }

            // Update cache immediately
            for (const [key, value] of Object.entries(data)) {
                const cacheKey = this.getCacheKey(key, storageType);
                this.cache.set(cacheKey, {
                    value,
                    timestamp: Date.now(),
                    ttl: 5000 // 5 second cache
                });
            }

            // Add to batch
            this.addToBatch({
                type: 'set',
                data,
                storageType
            }, resolve, reject);
        });
    }

    /**
     * Batched remove operation
     */
    public async remove(
        keys: string | string[],
        storageType: StorageType = 'local'
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.isStorageAvailable(storageType)) {
                reject(new Error(`${storageType} storage not available`));
                return;
            }

            const keyArray = Array.isArray(keys) ? keys : [keys];

            // Remove from cache immediately
            for (const key of keyArray) {
                const cacheKey = this.getCacheKey(key, storageType);
                this.cache.delete(cacheKey);
            }

            // Add to batch
            this.addToBatch({
                type: 'remove',
                keys: keyArray,
                storageType
            }, resolve, reject);
        });
    }

    /**
     * Adds operation to batch and manages batch execution
     */
    private addToBatch(
        operation: BatchedOperation,
        resolve: (result: any) => void,
        reject: (error: any) => void
    ): void {
        const batches = this.pendingBatches.get(operation.storageType)!;

        // Find or create a batch
        let batch = batches.find(b => b.operations.length < this.maxBatchSize);

        if (!batch) {
            batch = {
                operations: [],
                resolve: (_result: any) => { /* Will be overridden */ },
                reject: (_error: any) => { /* Will be overridden */ },
                timeout: setTimeout(() => this.executeBatch(operation.storageType), this.batchTimeout)
            };
            batches.push(batch);
        }

        batch.operations.push(operation);

        // Store resolve/reject for this specific operation
        const originalResolve = batch.resolve;
        const originalReject = batch.reject;

        batch.resolve = (result: any) => {
            originalResolve(result);
            resolve(result);
        };

        batch.reject = (error: any) => {
            originalReject(error);
            reject(error);
        };

        // Execute immediately if batch is full
        if (batch.operations.length >= this.maxBatchSize) {
            clearTimeout(batch.timeout);
            this.executeBatch(operation.storageType);
        }
    }

    /**
     * Executes a batch of operations
     */
    private async executeBatch(storageType: StorageType): Promise<void> {
        const batches = this.pendingBatches.get(storageType)!;
        const batch = batches.shift();

        if (!batch || batch.operations.length === 0) {
            return;
        }

        try {
            const storageApi = this.getStorageApi(storageType);

            // Group operations by type
            const setOperations = batch.operations.filter(op => op.type === 'set');
            const removeOperations = batch.operations.filter(op => op.type === 'remove');

            // Execute set operations
            if (setOperations.length > 0) {
                const combinedData = setOperations.reduce((acc, op) => {
                    return { ...acc, ...op.data };
                }, {});
                await storageApi.set(combinedData);
            }

            // Execute remove operations
            if (removeOperations.length > 0) {
                const keysToRemove = removeOperations.flatMap(op => op.keys || []);
                await storageApi.remove(keysToRemove);
            }

            batch.resolve(undefined);
        } catch (error) {
            log.error(`StorageBatcher.executeBatch error for ${storageType}:`, error);
            batch.reject(error);
        }
    }

    /**
     * Clears the cache
     */
    public clearCache(pattern?: string): void {
        if (pattern) {
            for (const [key] of this.cache) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    /**
     * Gets cache statistics for debugging
     */
    public getCacheStats(): { size: number; hitRate: number } {
        return {
            size: this.cache.size,
            hitRate: 0 // TODO: Implement hit rate tracking
        };
    }
}

// Export singleton instance
export const storageBatcher = StorageBatcher.getInstance();
