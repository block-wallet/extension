import { storageBatcher, StorageType } from './StorageBatcher';
import log from 'loglevel';

/**
 * Optimized storage utilities that provide high-level convenience functions
 * for common storage operations while leveraging the StorageBatcher for performance.
 */
export class OptimizedStorage {
    private static instance: OptimizedStorage;

    private constructor() {
        // Private constructor for singleton pattern
    }

    public static getInstance(): OptimizedStorage {
        if (!OptimizedStorage.instance) {
            OptimizedStorage.instance = new OptimizedStorage();
        }
        return OptimizedStorage.instance;
    }

    /**
     * Get a single value from storage with caching
     */
    public async getValue<T = any>(
        key: string,
        storageType: StorageType = 'local',
        defaultValue?: T,
        cacheTtl = 5000
    ): Promise<T | undefined> {
        try {
            const result = await storageBatcher.get(key, storageType, cacheTtl);
            return result[key] !== undefined ? result[key] : defaultValue;
        } catch (error) {
            log.error('OptimizedStorage.getValue error:', error);
            return defaultValue;
        }
    }

    /**
     * Get multiple values from storage with caching
     */
    public async getValues<T = Record<string, any>>(
        keys: string[],
        storageType: StorageType = 'local',
        cacheTtl = 5000
    ): Promise<T> {
        try {
            const result = await storageBatcher.get(keys, storageType, cacheTtl);
            return result as T;
        } catch (error) {
            log.error('OptimizedStorage.getValues error:', error);
            return {} as T;
        }
    }

    /**
     * Set a single value in storage
     */
    public async setValue(
        key: string,
        value: any,
        storageType: StorageType = 'local'
    ): Promise<void> {
        try {
            await storageBatcher.set({ [key]: value }, storageType);
        } catch (error) {
            log.error('OptimizedStorage.setValue error:', error);
            throw error;
        }
    }

    /**
     * Set multiple values in storage (automatically batched)
     */
    public async setValues(
        data: Record<string, any>,
        storageType: StorageType = 'local'
    ): Promise<void> {
        try {
            await storageBatcher.set(data, storageType);
        } catch (error) {
            log.error('OptimizedStorage.setValues error:', error);
            throw error;
        }
    }

    /**
     * Remove a single value from storage
     */
    public async removeValue(
        key: string,
        storageType: StorageType = 'local'
    ): Promise<void> {
        try {
            await storageBatcher.remove(key, storageType);
        } catch (error) {
            log.error('OptimizedStorage.removeValue error:', error);
            throw error;
        }
    }

    /**
     * Remove multiple values from storage
     */
    public async removeValues(
        keys: string[],
        storageType: StorageType = 'local'
    ): Promise<void> {
        try {
            await storageBatcher.remove(keys, storageType);
        } catch (error) {
            log.error('OptimizedStorage.removeValues error:', error);
            throw error;
        }
    }

    /**
     * Get or set a value with a factory function (cache pattern)
     */
    public async getOrSet<T>(
        key: string,
        factory: () => Promise<T> | T,
        storageType: StorageType = 'local',
        cacheTtl = 5000
    ): Promise<T> {
        try {
            const existing = await this.getValue<T>(key, storageType, undefined, cacheTtl);

            if (existing !== undefined) {
                return existing;
            }

            const newValue = await factory();
            await this.setValue(key, newValue, storageType);
            return newValue;
        } catch (error) {
            log.error('OptimizedStorage.getOrSet error:', error);
            throw error;
        }
    }

    /**
     * Clear cache for specific patterns
     */
    public clearCache(pattern?: string): void {
        storageBatcher.clearCache(pattern);
    }

    /**
     * Get cache statistics
     */
    public getCacheStats() {
        return storageBatcher.getCacheStats();
    }
}

// Export singleton instance
export const optimizedStorage = OptimizedStorage.getInstance();

/**
 * Convenience functions that can be used as drop-in replacements
 * for chrome.storage calls
 */
export const storage = {
    // Session storage convenience functions
    session: {
        get: <T = any>(key: string, defaultValue?: T, cacheTtl?: number) =>
            optimizedStorage.getValue<T>(key, 'session', defaultValue, cacheTtl),

        getMultiple: <T = Record<string, any>>(keys: string[], cacheTtl?: number) =>
            optimizedStorage.getValues<T>(keys, 'session', cacheTtl),

        set: (key: string, value: any) =>
            optimizedStorage.setValue(key, value, 'session'),

        setMultiple: (data: Record<string, any>) =>
            optimizedStorage.setValues(data, 'session'),

        remove: (key: string) =>
            optimizedStorage.removeValue(key, 'session'),

        removeMultiple: (keys: string[]) =>
            optimizedStorage.removeValues(keys, 'session'),
    },

    // Local storage convenience functions
    local: {
        get: <T = any>(key: string, defaultValue?: T, cacheTtl?: number) =>
            optimizedStorage.getValue<T>(key, 'local', defaultValue, cacheTtl),

        getMultiple: <T = Record<string, any>>(keys: string[], cacheTtl?: number) =>
            optimizedStorage.getValues<T>(keys, 'local', cacheTtl),

        set: (key: string, value: any) =>
            optimizedStorage.setValue(key, value, 'local'),

        setMultiple: (data: Record<string, any>) =>
            optimizedStorage.setValues(data, 'local'),

        remove: (key: string) =>
            optimizedStorage.removeValue(key, 'local'),

        removeMultiple: (keys: string[]) =>
            optimizedStorage.removeValues(keys, 'local'),
    },

    // Cache management
    cache: {
        clear: (pattern?: string) => optimizedStorage.clearCache(pattern),
        stats: () => optimizedStorage.getCacheStats(),
    }
};
