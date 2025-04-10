/**
 * Hardware Wallet Devices Vendors
 */
export enum Devices {
    LEDGER = 'LEDGER',
    TREZOR = 'TREZOR',
    KEYSTONE = 'KEYSTONE',
}

type HDPath = {
    name: string;
    path: string;
    default?: boolean;
};
type DevicesHDPath = {
    [device in Devices]: HDPath[];
};

export const BIP44_PATH = `m/44'/60'/0'/0`;
export const HDPaths: DevicesHDPath = {
    LEDGER: [
        { name: 'BIP44 Standard', path: BIP44_PATH },
        { name: 'Legacy (MEW / MyCrypto)', path: `m/44'/60'/0'` },
        { name: 'Ledger Live', path: `m/44'/60'/0'/0/0`, default: true },
    ],
    TREZOR: [
        { name: 'BIP44 Standard', path: BIP44_PATH, default: true },
        /*{ name: 'Trezor Testnets', path: `m/44'/1'/0'/0` },*/
    ],
    KEYSTONE: [
        { name: 'BIP44 Standard', path: BIP44_PATH },
        { name: 'Ledger Legacy', path: `m/44'/60'/0'` },
        { name: 'Ledger Live', path: `m/44'/60'/0'/0/0`, default: true },
    ],
};

/**
 * Interface for hardware wallet handler implementations
 * Provides a consistent API for different hardware wallet types
 */
export interface IHardwareWalletHandler {
    /**
     * Connects to a hardware wallet device
     * @returns Promise resolving to connection result
     */
    connect(): Promise<
        | boolean
        | {
            needsUserGesture: boolean;
            deviceName: string;
            needsEthereumApp?: boolean;
            message?: string;
        }
    >;

    /**
     * Completes the hardware wallet connection process
     * @returns Promise resolving to true if connection was successful
     */
    completeConnection(): Promise<boolean>;

    /**
     * Gets the device type associated with this handler
     */
    getDevice(): Devices;

    /**
     * Gets the keyring type associated with this handler
     */
    getKeyringType(): string;

    /**
     * Gets the default HD path for this device type
     */
    getDefaultHDPath(): string;

    /**
     * Sets the HD path for this device
     * @param hdPath The HD path to set
     */
    setHDPath(hdPath: string): Promise<void>;

    /**
     * Gets the current HD path for this device
     */
    getHDPath(): Promise<string>;

    /**
     * Imports accounts from the hardware wallet
     * @param accountIndexes Array of account indexes to import
     * @returns Promise resolving to array of imported account addresses
     */
    importAccounts(accountIndexes: number[]): Promise<string[]>;

    /**
     * Persists the hardware wallet state
     */
    persistState(): Promise<void>;

    /**
     * Cleans up resources when no longer needed
     */
    cleanup(): Promise<void>;
}

/**
 * Interface for hardware wallet connection results
 */
export interface HardwareWalletConnectionResult {
    success: boolean;
    needsUserGesture?: boolean;
    needsEthereumApp?: boolean;
    device?: Devices;
    message?: string;
    error?: Error;
}
