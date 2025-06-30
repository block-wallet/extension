/**
 * Error handling utilities
 * This file exports all error handling utilities for easy import
 */

import log from 'loglevel';

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
 * Error categories for better error handling and reporting
 */
export enum ErrorCategory {
    NETWORK = 'NETWORK',
    HARDWARE_WALLET = 'HARDWARE_WALLET',
    TRANSACTION = 'TRANSACTION',
    PERMISSION = 'PERMISSION',
    VALIDATION = 'VALIDATION',
    UNKNOWN = 'UNKNOWN'
}

/**
 * Standard error structure for consistent error handling
 */
export interface StandardError {
    code: string;
    message: string;
    category: ErrorCategory;
    timestamp: number;
    retryable: boolean;
    userVisible: boolean;
    originalError?: any;
}

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

/**
 * Enhanced error logging with categorization and context
 *
 * @param error The error to log
 * @param context Additional context about where the error occurred
 * @param category The category of error for better organization
 */
export function logError(
    error: any,
    context: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN
): StandardError {
    const standardError: StandardError = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        category,
        timestamp: Date.now(),
        retryable: error.retryable ?? true,
        userVisible: error.userVisible ?? true,
        originalError: error
    };

    // Log with appropriate level based on category
    const logMessage = `[${category}] ${context}: ${standardError.message}`;

    switch (category) {
        case ErrorCategory.HARDWARE_WALLET:
        case ErrorCategory.TRANSACTION:
            log.error(logMessage, standardError);
            break;
        case ErrorCategory.NETWORK:
        case ErrorCategory.VALIDATION:
            log.warn(logMessage, standardError);
            break;
        default:
            log.debug(logMessage, standardError);
    }

    return standardError;
}

/**
 * Wraps a function with comprehensive error handling and logging
 *
 * @param fn The function to wrap
 * @param context Context description for error logging
 * @param category Error category for proper handling
 * @param fallbackValue Optional fallback value if function fails
 */
export function withErrorHandling<T>(
    fn: () => Promise<T>,
    context: string,
    category: ErrorCategory,
    fallbackValue?: T
): () => Promise<T | undefined> {
    return async (): Promise<T | undefined> => {
        try {
            return await fn();
        } catch (error) {
            const standardError = logError(error, context, category);

            if (fallbackValue !== undefined) {
                return fallbackValue;
            }

            if (!standardError.userVisible) {
                return undefined;
            }

            throw error;
        }
    };
}

/**
 * Determines if an error is recoverable/retryable
 *
 * @param error The error to analyze
 * @returns Whether the error is retryable
 */
export function isRetryableError(error: any): boolean {
    // Network-related errors are usually retryable
    if (error.message?.includes('timeout') ||
        error.message?.includes('network') ||
        error.message?.includes('rate limit')) {
        return true;
    }

    // Hardware wallet temporary errors
    if (error.message?.includes('device busy') ||
        error.message?.includes('transaction pending')) {
        return true;
    }

    // Specific error codes that are retryable
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'DEVICE_BUSY', 'RATE_LIMITED'];
    if (error.code && retryableCodes.includes(error.code)) {
        return true;
    }

    return error.retryable ?? false;
}

/**
 * Creates a user-friendly error message from a technical error
 *
 * @param error The technical error
 * @param context Context for the error
 * @returns User-friendly error message
 */
export function createUserFriendlyMessage(error: any, context?: string): string {
    // Common error patterns with user-friendly messages
    const errorPatterns = [
        {
            pattern: /insufficient funds|not enough balance/i,
            message: "You don't have enough balance to complete this transaction"
        },
        {
            pattern: /user rejected|cancelled|denied/i,
            message: "Transaction was cancelled by user"
        },
        {
            pattern: /network error|connection failed/i,
            message: "Network connection failed. Please check your internet connection and try again"
        },
        {
            pattern: /timeout/i,
            message: "The operation timed out. Please try again"
        },
        {
            pattern: /device not found|no device/i,
            message: "Hardware wallet not found. Please ensure it's connected and unlocked"
        },
        {
            pattern: /app not open|ethereum app/i,
            message: "Please open the Ethereum app on your hardware wallet"
        }
    ];

    const errorMessage = error.message || String(error);

    for (const { pattern, message } of errorPatterns) {
        if (pattern.test(errorMessage)) {
            return message;
        }
    }

    // Return original message if no pattern matches
    return errorMessage || 'An unexpected error occurred';
}
