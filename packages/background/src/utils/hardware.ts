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
    }
}

class DeviceNotReadyError extends Error {
    constructor() {
        super();
        this.message =
            'An unknown error occurred.\nMake sure your device is unlocked and the Ethereum app is opened.';
        this.name = 'DeviceNotReadyError';
    }
}

class DeviceNotPluggedError extends Error {
    constructor() {
        super();
        this.message =
            'Hardware Device Disconnected.\nThe hardware device may be disconnected from your computer. Make sure your hardware device is plugged in and try again. ';
        this.name = 'DeviceNotPluggedError';
    }
}

class EnableBlindSigningOrContractDataError extends Error {
    constructor() {
        super();
        this.message =
            'Please enable Blind signing or Contract data in the Ethereum app Settings';
        this.name = 'EnableBlindSigningOrContractDataError';
    }
}

class RejectedByUserError extends Error {
    constructor(opType: HardwareWalletOpTypes) {
        super();
        switch (opType) {
            case HardwareWalletOpTypes.SIGN_TRANSACTION:
                this.message = 'The transaction was rejected in the device.';
                break;
            case HardwareWalletOpTypes.SIGN_MESSAGE:
                this.message =
                    'The signing request was rejected in the device.';
                break;
            case HardwareWalletOpTypes.APPROVE_ALLOWANCE:
                this.message =
                    'The allowance approval transaction was rejected in the device.';
                break;
            case HardwareWalletOpTypes.SIGN_SPEEDUP:
                this.message =
                    'The speedup transaction was rejected in the device.';
                break;
            case HardwareWalletOpTypes.SIGN_CANCEL:
                this.message =
                    'The cancel transaction was rejected in the device.';
                break;
            default:
                this.message = 'The operation was rejected in the device.';
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
    if (safeError.message.includes("Failed to execute 'requestDevice'")) {
        return new DeviceNotPluggedError();
    } else if (safeError.message.includes('UNKNOWN_ERROR')) {
        return new DeviceNotReadyError();
    } else if (safeError.message.includes('Condition of use not satisfied')) {
        return new RejectedByUserError(opType);
    } else if (safeError.message.includes('enable Blind')) {
        return new EnableBlindSigningOrContractDataError();
    } else {
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
    return parseLedgerError(error, opType);
};
