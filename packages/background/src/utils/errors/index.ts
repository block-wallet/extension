/**
 * Error handling utilities
 * This file exports all error handling utilities for easy import
 */

// Export all error types from hardware-wallet.ts
export * from './hardware-wallet';

// Export timeout utilities
export * from './timeout';

// Export storage utilities
export * from './storage';

// Common error keys for session storage
export const ERROR_STORAGE_KEYS = {
    LEDGER_CONNECTION: 'ledger_connection_error',
    LEDGER_OPERATION: 'ledger_operation_error',
    TREZOR_CONNECTION: 'trezor_connection_error',
    TREZOR_OPERATION: 'trezor_operation_error',
    KEYRING_OPERATION: 'keyring_operation_error',
    HARDWARE_WALLET: 'hardware_wallet_error',
};

/**
 * Safe try-catch wrapper for async functions that returns the result or a default value
 * 
 * @param fn The async function to execute
 * @param defaultValue The default value to return if the function throws
 * @param errorHandler Optional handler for errors
 * @returns The result of the function or the default value
 */
export async function trySafe<T, D = null>(
    fn: () => Promise<T>,
    defaultValue: D,
    errorHandler?: (error: any) => void
): Promise<T | D> {
    try {
        return await fn();
    } catch (error) {
        if (errorHandler) {
            errorHandler(error);
        }
        return defaultValue;
    }
} 