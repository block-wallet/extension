import { toError } from './toError';

export enum HardwareWalletOpTypes {
    SIGN_TRANSACTION = 'SIGN_TRANSACTION',
    SIGN_MESSAGE = 'SIGN_MESSAGE',
    APPROVE_ALLOWANCE = 'APPROVE_ALLOWANCE',
    SIGN_SPEEDUP = 'SIGN_SPEEDUP',
    SIGN_CANCEL = 'SIGN_CANCEL',
}

export class SignTimeoutError extends Error {
    constructor() {
        super();
        this.message = 'Timeout waiting for user signing';
        this.name = 'SignTimeoutError';
        console.error('[LEDGER ERROR] Sign timeout error');
    }
}

class DeviceNotReadyError extends Error {
    constructor() {
        super();
        this.message =
            'An unknown error occurred.\nMake sure your device is unlocked and the Ethereum app is opened.';
        this.name = 'DeviceNotReadyError';
        console.error('[LEDGER ERROR] Device not ready error - device may be locked or Ethereum app not open');
    }
}

class EthAppNotOpenError extends Error {
    constructor() {
        super();
        this.message =
            'Please open the Ethereum app on your Ledger device';
        this.name = 'EthAppNotOpenError';
        console.error('[LEDGER ERROR] Ethereum app not open on the device');
    }
}

class DeviceNotPluggedError extends Error {
    constructor() {
        super();
        this.message =
            'Hardware Device Disconnected.\nThe hardware device may be disconnected from your computer. Make sure your hardware device is plugged in and try again. ';
        this.name = 'DeviceNotPluggedError';
        console.error('[LEDGER ERROR] Device not plugged in error - check connection');
    }
}

class EnableBlindSigningOrContractDataError extends Error {
    constructor() {
        super();
        this.message =
            'Please enable Blind signing or Contract data in the Ethereum app Settings';
        this.name = 'EnableBlindSigningOrContractDataError';
        console.error('[LEDGER ERROR] Contract data not enabled in Ethereum app settings');
    }
}

class RejectedByUserError extends Error {
    constructor(opType: HardwareWalletOpTypes) {
        super();
        switch (opType) {
            case HardwareWalletOpTypes.SIGN_TRANSACTION:
                this.message = 'The transaction was rejected in the device.';
                console.error('[LEDGER ERROR] Transaction rejected by user');
                break;
            case HardwareWalletOpTypes.SIGN_MESSAGE:
                this.message =
                    'The signing request was rejected in the device.';
                console.error('[LEDGER ERROR] Message signing rejected by user');
                break;
            case HardwareWalletOpTypes.APPROVE_ALLOWANCE:
                this.message =
                    'The allowance approval transaction was rejected in the device.';
                console.error('[LEDGER ERROR] Allowance approval rejected by user');
                break;
            case HardwareWalletOpTypes.SIGN_SPEEDUP:
                this.message =
                    'The speedup transaction was rejected in the device.';
                console.error('[LEDGER ERROR] Speedup transaction rejected by user');
                break;
            case HardwareWalletOpTypes.SIGN_CANCEL:
                this.message =
                    'The cancel transaction was rejected in the device.';
                console.error('[LEDGER ERROR] Cancel transaction rejected by user');
                break;
            default:
                this.message = 'The operation was rejected in the device.';
                console.error('[LEDGER ERROR] Operation rejected by user');
                break;
        }
        this.name = 'RejectedByUserError';
    }
}

type LedgerError = DeviceNotReadyError | DeviceNotPluggedError;

const parseLedgerError = (
    error: Error,
    opType: HardwareWalletOpTypes
): LedgerError => {
    const safeError = toError(error);
    console.log('[LEDGER ERROR] Parsing Ledger error:', safeError.message);

    // Check for transport-specific errors
    if (safeError.message.includes('TRANSACTION_REJECTED')) {
        console.log('[LEDGER ERROR] Transaction rejected by user');
        return new RejectedByUserError(opType);
    } else if (safeError.message.includes('APP_NOT_OPEN')) {
        console.log('[LEDGER ERROR] Ethereum app not open');
        return new EthAppNotOpenError();
    } else if (safeError.message.includes('TRANSPORT_ERROR')) {
        console.log('[LEDGER ERROR] Transport error - device likely disconnected');
        return new DeviceNotPluggedError();
    } else if (safeError.message.includes('USER_CANCELED')) {
        console.log('[LEDGER ERROR] User canceled the operation');
        return new RejectedByUserError(opType);
    } else if (safeError.message.includes('DEVICE_MEMORY_LIMIT')) {
        console.log('[LEDGER ERROR] Device memory limit reached');
        return new Error('Transaction too complex for your Ledger device');
    }

    // Original error parsing
    if (safeError.message.includes("Failed to execute 'requestDevice'")) {
        console.log('[LEDGER ERROR] Failed to request device - device not plugged');
        return new DeviceNotPluggedError();
    } else if (safeError.message.includes('UNKNOWN_ERROR')) {
        console.log('[LEDGER ERROR] Unknown error - device likely not ready');
        return new DeviceNotReadyError();
    } else if (safeError.message.includes('Condition of use not satisfied')) {
        console.log('[LEDGER ERROR] Condition of use not satisfied - user rejected operation');
        return new RejectedByUserError(opType);
    } else if (safeError.message.includes('enable Blind')) {
        console.log('[LEDGER ERROR] Contract data not enabled in Ethereum app');
        return new EnableBlindSigningOrContractDataError();
    } else {
        console.log('[LEDGER ERROR] Unhandled error:', safeError.message);
        return safeError;
    }
};

type HardwareWalletError = DeviceNotReadyError | DeviceNotPluggedError;

/**
 * parseHardwareWalletError
 *
 * It parses the error thrown by the hardware wallet.
 *
 * @param error
 * @returns The parsed error.
 */
export const parseHardwareWalletError = (
    error: Error,
    opType: HardwareWalletOpTypes = HardwareWalletOpTypes.SIGN_TRANSACTION
): HardwareWalletError => {
    console.log('[LEDGER ERROR] Hardware wallet error received:', error.message);
    return parseLedgerError(error, opType);
};
