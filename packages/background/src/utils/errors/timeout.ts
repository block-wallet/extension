/**
 * Utility for adding timeouts to promises
 * Helps prevent hanging promises in hardware wallet operations
 */

import { TimeoutError } from './hardware-wallet';

/**
 * Options for the timeout function
 */
interface TimeoutOptions {
    /**
     * Timeout duration in milliseconds
     */
    timeoutMs: number;

    /**
     * Error message to use if timeout occurs
     */
    message?: string;

    /**
     * Additional context to include in the error
     */
    context?: Record<string, any>;

    /**
     * Whether to abort the operation when timeout occurs (if AbortController is provided)
     */
    abortOnTimeout?: boolean;
}

/**
 * Creates a promise that rejects after the specified timeout
 * 
 * @param timeoutMs Timeout in milliseconds
 * @param message Error message to use if timeout occurs
 * @param context Additional context to include in the error
 * @returns A promise that rejects after the timeout
 */
function createTimeoutPromise(
    timeoutMs: number,
    message?: string,
    context?: Record<string, any>
): Promise<never> {
    return new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
            const errorMessage = message || `Operation timed out after ${timeoutMs}ms`;
            reject(new TimeoutError(errorMessage, {
                operationType: context?.operationType,
                deviceType: context?.deviceType
            }));
        }, timeoutMs);

        // Ensure the timeout is cleared if the promise is garbage collected
        if (timeoutId && typeof timeoutId === 'object') {
            (timeoutId as any).unref?.();
        }
    });
}

/**
 * Adds a timeout to a promise
 * If the promise doesn't resolve within the specified time, it will reject with a TimeoutError
 * 
 * @param promise The promise to add a timeout to
 * @param options Timeout options
 * @returns A new promise that will reject if the original promise doesn't complete in time
 */
export function withTimeout<T>(
    promise: Promise<T>,
    options: TimeoutOptions
): Promise<T> {
    const { timeoutMs, message, context, abortOnTimeout } = options;

    // Create abort controller if needed for cleanup
    const abortController = abortOnTimeout ? new AbortController() : null;
    if (abortController && context) {
        context.abortSignal = abortController.signal;
    }

    return Promise.race([
        promise,
        createTimeoutPromise(timeoutMs, message, context)
    ]).catch(error => {
        // If timeout occurred and abort was requested, abort the operation
        if (error instanceof TimeoutError && abortController) {
            abortController.abort(error);
        }
        throw error;
    });
}

/**
 * Adds retry capability with timeout to a promise-returning function
 * Will retry the function up to maxRetries times if it fails with a retriable error
 * 
 * @param fn The function to retry
 * @param options Options for retries and timeout
 * @returns A promise that resolves with the result of the function or rejects after all retries fail
 */
export async function withTimeoutAndRetry<T>(
    fn: (attempt: number, signal?: AbortSignal) => Promise<T>,
    options: TimeoutOptions & {
        maxRetries: number;
        retryDelayMs?: number;
        shouldRetry?: (error: any) => boolean;
        onRetry?: (error: any, attempt: number) => void;
    }
): Promise<T> {
    const {
        maxRetries,
        retryDelayMs = 1000,
        shouldRetry = (error) => {
            // Default retry condition: retry if error has retriable property set to true
            return error?.retriable === true;
        },
        onRetry,
        ...timeoutOptions
    } = options;

    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            const abortController = new AbortController();

            // Use our timeout utility to prevent hanging
            return await withTimeout(
                fn(attempt, abortController.signal),
                {
                    ...timeoutOptions,
                    abortOnTimeout: true,
                    context: {
                        ...timeoutOptions.context,
                        attempt,
                        maxRetries
                    }
                }
            );
        } catch (error) {
            lastError = error;

            // If this was the last attempt, or we shouldn't retry, rethrow
            if (attempt > maxRetries || !shouldRetry(error)) {
                throw error;
            }

            // Call the retry callback if provided
            if (onRetry) {
                onRetry(error, attempt);
            }

            // Wait before retrying
            if (retryDelayMs > 0 && attempt < maxRetries + 1) {
                await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            }
        }
    }

    // This should never happen due to the throw in the catch block,
    // but TypeScript doesn't know that
    throw lastError;
}

/**
 * Creates a cancellable timeout that can be used to add a timeout to an operation
 * Useful when you need to cancel the timeout if the operation completes successfully
 */
export class CancellableTimeout {
    private timeoutId: ReturnType<typeof setTimeout> | null = null;
    private rejected = false;
    private promiseReject: ((error: Error) => void) | null = null;

    /**
     * Create a new cancellable timeout
     * 
     * @param timeoutMs Timeout in milliseconds
     * @param message Message to use in timeout error
     * @param context Additional context to include in the error
     */
    constructor(
        private timeoutMs: number,
        private message?: string,
        private context?: Record<string, any>
    ) { }

    /**
     * Start the timeout
     * @returns A promise that rejects when the timeout expires
     */
    public start(): Promise<never> {
        this.clear();

        return new Promise<never>((_, reject) => {
            this.promiseReject = reject;

            this.timeoutId = setTimeout(() => {
                this.rejected = true;
                const errorMessage = this.message || `Operation timed out after ${this.timeoutMs}ms`;
                reject(new TimeoutError(errorMessage, {
                    operationType: this.context?.operationType,
                    deviceType: this.context?.deviceType
                }));
            }, this.timeoutMs);

            // Ensure the timeout is cleared if the promise is garbage collected
            if (this.timeoutId && typeof this.timeoutId === 'object') {
                (this.timeoutId as any).unref?.();
            }
        });
    }

    /**
     * Clear the timeout if it's still running
     */
    public clear(): void {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    /**
     * Check if the timeout has already rejected
     */
    public hasTimedOut(): boolean {
        return this.rejected;
    }

    /**
     * Reset the timeout with a new duration
     * 
     * @param newTimeoutMs New timeout duration in milliseconds
     * @returns A promise that rejects when the timeout expires
     */
    public reset(newTimeoutMs?: number): Promise<never> {
        this.clear();

        if (newTimeoutMs !== undefined) {
            this.timeoutMs = newTimeoutMs;
        }

        this.rejected = false;
        return this.start();
    }
} 