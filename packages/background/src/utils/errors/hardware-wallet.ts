import { TransportStatusError } from '@ledgerhq/errors';

/**
 * Error codes for hardware wallet operations
 * Used to standardize error handling across the codebase
 */
export enum HardwareWalletErrorCode {
    // Connection errors
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    DISCONNECTED = 'DISCONNECTED',
    TIMEOUT = 'TIMEOUT',
    PERMISSION_DENIED = 'PERMISSION_DENIED',

    // App errors
    APP_NOT_OPEN = 'APP_NOT_OPEN',
    WRONG_APP = 'WRONG_APP',

    // Operation errors
    USER_REJECTED = 'USER_REJECTED',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',

    // Device errors
    DEVICE_BUSY = 'DEVICE_BUSY',
    LOCKED = 'LOCKED',

    // Environment errors
    DOM_ACCESS_DENIED = 'DOM_ACCESS_DENIED',
    SERVICE_WORKER_CONTEXT = 'SERVICE_WORKER_CONTEXT',

    // HD Path errors
    INVALID_HD_PATH = 'INVALID_HD_PATH',

    // Session storage errors
    STORAGE_ERROR = 'STORAGE_ERROR',

    // Retry errors
    MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED'
}

/**
 * Base class for all hardware wallet errors
 * Provides a standardized error structure with code, message, and original error
 */
export class HardwareWalletError extends Error {
    code: HardwareWalletErrorCode;
    originalError?: Error | unknown;
    deviceType?: string;
    retriable: boolean;
    userVisible: boolean;

    constructor(
        code: HardwareWalletErrorCode,
        message: string,
        options: {
            originalError?: Error | unknown;
            deviceType?: string;
            retriable?: boolean;
            userVisible?: boolean;
        } = {}
    ) {
        super(message);
        this.name = 'HardwareWalletError';
        this.code = code;
        this.originalError = options.originalError;
        this.deviceType = options.deviceType;
        this.retriable = options.retriable ?? false;
        this.userVisible = options.userVisible ?? true;

        // Ensures proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, HardwareWalletError.prototype);
    }

    /**
     * Formats the error for storage in session storage
     * @returns An object representation of the error suitable for storage
     */
    toStorageObject() {
        return {
            code: this.code,
            message: this.message,
            deviceType: this.deviceType,
            retriable: this.retriable,
            timestamp: Date.now(),
            name: this.name
        };
    }

    /**
     * Creates a HardwareWalletError from a storage object
     * @param obj The storage object representation of the error
     * @returns A new HardwareWalletError instance
     */
    static fromStorageObject(obj: any): HardwareWalletError {
        return new HardwareWalletError(
            obj.code,
            obj.message,
            {
                deviceType: obj.deviceType,
                retriable: obj.retriable
            }
        );
    }
}

/**
 * Error thrown when a connection to a hardware wallet fails
 */
export class ConnectionError extends HardwareWalletError {
    constructor(
        message: string,
        options: {
            originalError?: Error | unknown;
            deviceType?: string;
            code?: HardwareWalletErrorCode;
        } = {}
    ) {
        super(
            options.code || HardwareWalletErrorCode.CONNECTION_FAILED,
            message,
            {
                ...options,
                retriable: true,
                userVisible: true
            }
        );
        this.name = 'ConnectionError';

        // Ensures proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, ConnectionError.prototype);
    }
}

/**
 * Error thrown when a hardware wallet operation times out
 */
export class TimeoutError extends HardwareWalletError {
    constructor(
        message = 'Operation timed out',
        options: {
            originalError?: Error | unknown;
            deviceType?: string;
            operationType?: string;
        } = {}
    ) {
        super(
            HardwareWalletErrorCode.TIMEOUT,
            message,
            {
                ...options,
                retriable: true,
                userVisible: true
            }
        );
        this.name = 'TimeoutError';

        // Ensures proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}

/**
 * Error thrown when the Ethereum app is not open on the device
 */
export class AppNotOpenError extends HardwareWalletError {
    constructor(
        message = 'Ethereum app is not open on the device',
        options: {
            originalError?: Error | unknown;
            deviceType?: string;
        } = {}
    ) {
        super(
            HardwareWalletErrorCode.APP_NOT_OPEN,
            message,
            {
                ...options,
                retriable: true,
                userVisible: true
            }
        );
        this.name = 'AppNotOpenError';

        // Ensures proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, AppNotOpenError.prototype);
    }
}

/**
 * Error thrown when the user rejects an operation on the device
 */
export class UserRejectedError extends HardwareWalletError {
    constructor(
        message = 'Operation was rejected by the user',
        options: {
            originalError?: Error | unknown;
            deviceType?: string;
        } = {}
    ) {
        super(
            HardwareWalletErrorCode.USER_REJECTED,
            message,
            {
                ...options,
                retriable: false,
                userVisible: true
            }
        );
        this.name = 'UserRejectedError';

        // Ensures proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, UserRejectedError.prototype);
    }
}

/**
 * Error thrown when we're in a service worker context without DOM access
 */
export class ServiceWorkerContextError extends HardwareWalletError {
    constructor(
        message = 'Operation requires DOM access but is in service worker context',
        options: {
            originalError?: Error | unknown;
            deviceType?: string;
        } = {}
    ) {
        super(
            HardwareWalletErrorCode.SERVICE_WORKER_CONTEXT,
            message,
            {
                ...options,
                retriable: false,
                userVisible: false // This is for internal handling
            }
        );
        this.name = 'ServiceWorkerContextError';

        // Ensures proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, ServiceWorkerContextError.prototype);
    }
}

/**
 * Error thrown when storage operations fail
 */
export class StorageError extends HardwareWalletError {
    constructor(
        message = 'Failed to store or retrieve data',
        options: {
            originalError?: Error | unknown;
            deviceType?: string;
            storageType?: 'session' | 'local';
        } = {}
    ) {
        super(
            HardwareWalletErrorCode.STORAGE_ERROR,
            message,
            {
                ...options,
                retriable: true,
                userVisible: false
            }
        );
        this.name = 'StorageError';

        // Ensures proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, StorageError.prototype);
    }
}

/**
 * Error thrown when max retries are exceeded
 */
export class MaxRetriesExceededError extends HardwareWalletError {
    constructor(
        message = 'Maximum retry attempts exceeded',
        options: {
            originalError?: Error | unknown;
            deviceType?: string;
            retryCount?: number;
        } = {}
    ) {
        super(
            HardwareWalletErrorCode.MAX_RETRIES_EXCEEDED,
            message,
            {
                ...options,
                retriable: false,
                userVisible: true
            }
        );
        this.name = 'MaxRetriesExceededError';

        // Ensures proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, MaxRetriesExceededError.prototype);
    }
}

/**
 * Converts Ledger-specific errors to our standardized error format
 * @param error The original error from Ledger operations
 * @returns A standardized HardwareWalletError
 */
export function convertLedgerError(error: any): HardwareWalletError {
    if (error instanceof TransportStatusError) {
        // Handle specific Ledger status codes
        switch (error.statusCode) {
            case 0x6985: // Tx rejected on device
                return new UserRejectedError('Transaction rejected by user', {
                    originalError: error,
                    deviceType: 'LEDGER'
                });

            case 0x6804: // Device locked or busy
                return new HardwareWalletError(
                    HardwareWalletErrorCode.DEVICE_BUSY,
                    'Device is busy or locked',
                    {
                        originalError: error,
                        deviceType: 'LEDGER',
                        retriable: true,
                        userVisible: true
                    }
                );

            case 0x6982: // Security not validated (user canceled prompt)
                return new UserRejectedError('Operation canceled by user', {
                    originalError: error,
                    deviceType: 'LEDGER'
                });

            case 0x6700: // Wrong length
                return new HardwareWalletError(
                    HardwareWalletErrorCode.UNSUPPORTED_OPERATION,
                    'Incorrect data format sent to device',
                    {
                        originalError: error,
                        deviceType: 'LEDGER',
                        retriable: false,
                        userVisible: true
                    }
                );

            case 0x6a80: // Invalid data
            case 0x6a81: // Invalid parameter
            case 0x6a82: // Invalid file
            case 0x6a83: // Invalid file
                return new HardwareWalletError(
                    HardwareWalletErrorCode.UNSUPPORTED_OPERATION,
                    'Operation not supported by device',
                    {
                        originalError: error,
                        deviceType: 'LEDGER',
                        retriable: false,
                        userVisible: true
                    }
                );

            case 0x6b00: // Wrong parameter P1 or P2
                return new HardwareWalletError(
                    HardwareWalletErrorCode.WRONG_APP,
                    'Please make sure the Ethereum app is open on your Ledger device',
                    {
                        originalError: error,
                        deviceType: 'LEDGER',
                        retriable: true,
                        userVisible: true
                    }
                );

            default:
                return new HardwareWalletError(
                    HardwareWalletErrorCode.UNKNOWN_ERROR,
                    `Ledger error: ${error.message || 'Unknown error'}`,
                    {
                        originalError: error,
                        deviceType: 'LEDGER',
                        retriable: false,
                        userVisible: true
                    }
                );
        }
    }

    // Handle general connection errors
    if (error.message && error.message.includes('document is not defined')) {
        return new ServiceWorkerContextError(
            'This operation requires user interaction',
            {
                originalError: error,
                deviceType: 'LEDGER'
            }
        );
    }

    if (error.message && error.message.includes('Unable to claim interface')) {
        return new ConnectionError(
            'Device is in use by another application',
            {
                originalError: error,
                deviceType: 'LEDGER'
            }
        );
    }

    if (error.message && error.message.includes('No device selected')) {
        return new ConnectionError(
            'No device selected. Please connect your hardware wallet',
            {
                originalError: error,
                deviceType: 'LEDGER'
            }
        );
    }

    if (error.message && error.message.includes('timeout')) {
        return new TimeoutError(
            'Operation timed out. Please try again',
            {
                originalError: error,
                deviceType: 'LEDGER'
            }
        );
    }

    // Default to unknown error
    return new HardwareWalletError(
        HardwareWalletErrorCode.UNKNOWN_ERROR,
        error.message || 'Unknown hardware wallet error',
        {
            originalError: error,
            deviceType: 'LEDGER',
            retriable: true,
            userVisible: true
        }
    );
}

/**
 * Converts Trezor-specific errors to our standardized error format
 * @param error The original error from Trezor operations
 * @returns A standardized HardwareWalletError
 */
export function convertTrezorError(error: any): HardwareWalletError {
    // Handle specific Trezor error messages
    if (error.message) {
        if (error.message.includes('Cancelled') || error.message.includes('Rejected')) {
            return new UserRejectedError(
                'Operation was rejected by the user',
                {
                    originalError: error,
                    deviceType: 'TREZOR'
                }
            );
        }

        if (error.message.includes('timeout')) {
            return new TimeoutError(
                'Operation timed out. Please try again',
                {
                    originalError: error,
                    deviceType: 'TREZOR'
                }
            );
        }

        if (error.message.includes('device disconnected')) {
            return new ConnectionError(
                'Device disconnected during operation',
                {
                    originalError: error,
                    deviceType: 'TREZOR',
                    code: HardwareWalletErrorCode.DISCONNECTED
                }
            );
        }

        if (error.message.includes('Popup closed')) {
            return new HardwareWalletError(
                HardwareWalletErrorCode.PERMISSION_DENIED,
                'Trezor Connect popup was closed',
                {
                    originalError: error,
                    deviceType: 'TREZOR',
                    retriable: true,
                    userVisible: true
                }
            );
        }
    }

    // Default to unknown error
    return new HardwareWalletError(
        HardwareWalletErrorCode.UNKNOWN_ERROR,
        error.message || 'Unknown Trezor error',
        {
            originalError: error,
            deviceType: 'TREZOR',
            retriable: true,
            userVisible: true
        }
    );
}

/**
 * Helper function to convert any hardware wallet error to our standardized format
 * @param error The original error
 * @param deviceType The type of device that generated the error
 * @returns A standardized HardwareWalletError
 */
export function convertHardwareWalletError(error: any, deviceType?: string): HardwareWalletError {
    // If it's already a HardwareWalletError, return it
    if (error instanceof HardwareWalletError) {
        return error;
    }

    // Convert based on device type
    switch (deviceType) {
        case 'LEDGER':
            return convertLedgerError(error);
        case 'TREZOR':
            return convertTrezorError(error);
        default:
            // Generic handling for unknown device types
            return new HardwareWalletError(
                HardwareWalletErrorCode.UNKNOWN_ERROR,
                error.message || 'Unknown hardware wallet error',
                {
                    originalError: error,
                    deviceType,
                    retriable: true,
                    userVisible: true
                }
            );
    }
} 