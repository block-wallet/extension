/**
 * Safe storage utilities for hardware wallet error handling
 * Provides robust wrappers around chrome.storage.session operations
 */

import log from 'loglevel';
import { StorageError } from './hardware-wallet';

/**
 * Interface for error storage operations
 */
interface ErrorStorage {
    /**
     * Store an error in session storage
     * @param key The storage key
     * @param error The error to store
     * @param storageType The type of storage to use
     * @returns A promise that resolves when the error is stored
     */
    storeError(
        key: string,
        error: Error | any,
        storageType?: 'session' | 'local'
    ): Promise<void>;

    /**
     * Retrieve an error from session storage
     * @param key The storage key
     * @param storageType The type of storage to use
     * @returns A promise that resolves with the error if found, null otherwise
     */
    retrieveError(
        key: string,
        storageType?: 'session' | 'local'
    ): Promise<any | null>;

    /**
     * Clear an error from session storage
     * @param key The storage key
     * @param storageType The type of storage to use
     * @returns A promise that resolves when the error is cleared
     */
    clearError(
        key: string,
        storageType?: 'session' | 'local'
    ): Promise<void>;
}

/**
 * Safely accesses chrome storage APIs with fallbacks
 */
class SafeStorageAccess {
    /**
     * Safely gets a value from storage
     * @param key The storage key
     * @param storageType The type of storage to use
     * @returns A promise that resolves with the value if found, null otherwise
     */
    async get(key: string, storageType: 'session' | 'local' = 'session'): Promise<any | null> {
        try {
            // Check if the appropriate storage API is available
            if (storageType === 'session' && chrome.storage?.session) {
                return await chrome.storage.session.get(key);
            } else if (storageType === 'local' && chrome.storage?.local) {
                return await chrome.storage.local.get(key);
            } else {
                // Fallback to localStorage if chrome.storage is not available
                if (storageType === 'local' && typeof localStorage !== 'undefined') {
                    try {
                        const value = localStorage.getItem(key);
                        return value ? JSON.parse(value) : null;
                    } catch (e) {
                        log.warn(`Error using localStorage fallback for ${key}:`, e);
                        return null;
                    }
                }

                // If no storage is available, log warning and return null
                log.warn(`No ${storageType} storage available for key ${key}`);
                return null;
            }
        } catch (error) {
            log.error(`Error getting ${key} from ${storageType} storage:`, error);
            return null;
        }
    }

    /**
     * Safely sets a value in storage
     * @param key The storage key
     * @param value The value to store
     * @param storageType The type of storage to use
     * @returns A promise that resolves when the value is stored
     */
    async set(key: string, value: any, storageType: 'session' | 'local' = 'session'): Promise<void> {
        try {
            // Convert value to storable format if needed
            const storableValue = value !== null && typeof value === 'object'
                ? value
                : { [key]: value };

            // Use the appropriate storage API
            if (storageType === 'session' && chrome.storage?.session) {
                await chrome.storage.session.set({ [key]: storableValue });
            } else if (storageType === 'local' && chrome.storage?.local) {
                await chrome.storage.local.set({ [key]: storableValue });
            } else {
                // Fallback to localStorage if chrome.storage is not available
                if (storageType === 'local' && typeof localStorage !== 'undefined') {
                    try {
                        localStorage.setItem(key, JSON.stringify(storableValue));
                    } catch (e) {
                        log.warn(`Error using localStorage fallback for ${key}:`, e);
                        throw e;
                    }
                } else {
                    // If no storage is available, log warning
                    log.warn(`No ${storageType} storage available for key ${key}`);
                }
            }
        } catch (error) {
            log.error(`Error setting ${key} in ${storageType} storage:`, error);
            throw new StorageError(
                `Failed to store ${key} in ${storageType} storage`,
                {
                    originalError: error,
                    storageType
                }
            );
        }
    }

    /**
     * Safely removes a value from storage
     * @param key The storage key
     * @param storageType The type of storage to use
     * @returns A promise that resolves when the value is removed
     */
    async remove(key: string, storageType: 'session' | 'local' = 'session'): Promise<void> {
        try {
            // Use the appropriate storage API
            if (storageType === 'session' && chrome.storage?.session) {
                await chrome.storage.session.remove(key);
            } else if (storageType === 'local' && chrome.storage?.local) {
                await chrome.storage.local.remove(key);
            } else {
                // Fallback to localStorage if chrome.storage is not available
                if (storageType === 'local' && typeof localStorage !== 'undefined') {
                    try {
                        localStorage.removeItem(key);
                    } catch (e) {
                        log.warn(`Error using localStorage fallback for ${key}:`, e);
                    }
                } else {
                    // If no storage is available, log warning
                    log.warn(`No ${storageType} storage available for key ${key}`);
                }
            }
        } catch (error) {
            log.error(`Error removing ${key} from ${storageType} storage:`, error);
        }
    }
}

/**
 * Implementation of ErrorStorage interface
 * Uses SafeStorageAccess for robust storage operations
 */
class ErrorStorageImpl implements ErrorStorage {
    private storage = new SafeStorageAccess();

    /**
     * Store an error in session storage
     * @param key The storage key
     * @param error The error to store
     * @param storageType The type of storage to use
     * @returns A promise that resolves when the error is stored
     */
    async storeError(
        key: string,
        error: Error | any,
        storageType: 'session' | 'local' = 'session'
    ): Promise<void> {
        // Format the error for storage
        const storableError = this.formatErrorForStorage(error);

        // Store with retries
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                await this.storage.set(key, storableError, storageType);
                return;
            } catch (e) {
                attempts++;
                if (attempts >= maxAttempts) {
                    log.error(`Failed to store error ${key} after ${maxAttempts} attempts:`, e);
                    throw e;
                }
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    /**
     * Retrieve an error from session storage
     * @param key The storage key
     * @param storageType The type of storage to use
     * @returns A promise that resolves with the error if found, null otherwise
     */
    async retrieveError(
        key: string,
        storageType: 'session' | 'local' = 'session'
    ): Promise<any | null> {
        const result = await this.storage.get(key, storageType);

        if (!result || !result[key]) {
            return null;
        }

        return result[key];
    }

    /**
     * Clear an error from session storage
     * @param key The storage key
     * @param storageType The type of storage to use
     * @returns A promise that resolves when the error is cleared
     */
    async clearError(
        key: string,
        storageType: 'session' | 'local' = 'session'
    ): Promise<void> {
        await this.storage.remove(key, storageType);
    }

    /**
     * Format an error for storage
     * @param error The error to format
     * @returns A storage-friendly representation of the error
     */
    private formatErrorForStorage(error: Error | any): any {
        // Check if it's our custom error type with toStorageObject method
        if (error && typeof error.toStorageObject === 'function') {
            return error.toStorageObject();
        }

        // Handle standard Error objects
        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack,
                timestamp: Date.now()
            };
        }

        // Handle generic objects or primitive values
        return {
            value: error,
            timestamp: Date.now()
        };
    }
}

/**
 * Singleton instance of ErrorStorage
 */
export const errorStorage = new ErrorStorageImpl(); 