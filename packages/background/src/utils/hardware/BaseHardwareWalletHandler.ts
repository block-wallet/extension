import { Devices, HDPaths, IHardwareWalletHandler } from '../types/hardware';
import { KeyringTypes } from '../../controllers/KeyringControllerDerivated';
import log from 'loglevel';

/**
 * Base hardware wallet handler implementation
 * Contains common functionality for all hardware wallet types
 */
export abstract class BaseHardwareWalletHandler implements IHardwareWalletHandler {
    // Cache HD paths to avoid redundant storage access
    protected hdPathCache: string | null = null;

    // Store active operation timeouts
    protected activeTimeouts: Set<NodeJS.Timeout> = new Set();

    // Time thresholds for operations
    protected CONNECT_TIMEOUT = 45000; // 45 seconds
    protected IMPORT_TIMEOUT = 60000;  // 60 seconds
    protected APP_CHECK_TIMEOUT = 20000; // 20 seconds

    /**
     * Creates a new BaseHardwareWalletHandler for a specific device type
     * @param device The hardware wallet device type
     * @param keyringController Reference to the keyring controller
     */
    constructor(
        protected device: Devices,
        protected keyringController: any
    ) {
        log.debug(`Initializing hardware wallet handler for ${device}`);
    }

    /**
     * Gets the device type for this handler
     */
    public getDevice(): Devices {
        return this.device;
    }

    /**
     * Gets the keyring type from the device type
     */
    public getKeyringType(): string {
        switch (this.device) {
            case Devices.LEDGER:
                return KeyringTypes.LEDGER;
            case Devices.TREZOR:
                return KeyringTypes.TREZOR;
            // case Devices.QR:
            //     return KeyringTypes.QR;
            default:
                throw new Error(`Unsupported device: ${this.device}`);
        }
    }

    /**
     * Gets the default HD path for this device type
     */
    public getDefaultHDPath(): string {
        const hdPaths = HDPaths[this.device];
        if (!hdPaths || hdPaths.length === 0) {
            log.warn(
                `No HD paths defined for device ${this.device}, using default path`
            );
            return "m/44'/60'/0'/0/0";
        }

        const defaultPath = hdPaths.find((data) => data.default)?.path;
        if (!defaultPath) {
            log.warn(
                `No default HD path found for device ${this.device}, using default path`
            );
            return "m/44'/60'/0'/0/0";
        }

        return defaultPath;
    }

    /**
     * Abstract method to connect to a hardware wallet
     * Must be implemented by derived classes
     */
    public abstract connect(): Promise<
        | boolean
        | {
            needsUserGesture: boolean;
            deviceName: string;
            needsEthereumApp?: boolean;
            message?: string;
        }
    >;

    /**
     * Abstract method to complete hardware wallet connection
     * Must be implemented by derived classes
     */
    public abstract completeConnection(): Promise<boolean>;

    /**
     * Abstract method to set HD path for a device
     * Must be implemented by derived classes
     */
    public abstract setHDPath(hdPath: string): Promise<void>;

    /**
     * Abstract method to get current HD path for device
     * Must be implemented by derived classes
     */
    public abstract getHDPath(): Promise<string>;

    /**
     * Abstract method to import accounts from hardware wallet
     * Must be implemented by derived classes
     */
    public abstract importAccounts(accountIndexes: number[]): Promise<string[]>;

    /**
     * Persists the hardware wallet state
     */
    public async persistState(): Promise<void> {
        try {
            log.debug(`Persisting keyring state for ${this.device}`);
            if (this.keyringController.persistHardwareKeyringState) {
                await this.keyringController.persistHardwareKeyringState(this.device);
            } else {
                // Fallback to fullUpdate if persistHardwareKeyringState is not available
                await this.keyringController.fullUpdate();
            }
        } catch (error) {
            log.error(`Error persisting keyring state for ${this.device}:`, error);
            throw error;
        }
    }

    /**
     * Checks if DOM access is available
     * Hardware wallet interactions often require DOM access,
     * which is not available in service worker contexts
     */
    protected hasDomAccess(): boolean {
        try {
            return typeof document !== 'undefined' &&
                document !== null &&
                typeof document.createElement === 'function';
        } catch (e) {
            return false;
        }
    }

    /**
     * Runs an operation with a timeout
     * @param operation The operation to run
     * @param timeoutMs Timeout in milliseconds
     * @param operationName Name of the operation for error messages
     */
    protected async runWithTimeout<T>(
        operation: () => Promise<T>,
        timeoutMs: number,
        operationName: string
    ): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            // Create timeout that rejects the promise if operation takes too long
            const timeoutId = setTimeout(() => {
                this.activeTimeouts.delete(timeoutId);
                reject(new Error(`${operationName} operation for ${this.device} timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            // Track the timeout for cleanup
            this.activeTimeouts.add(timeoutId);

            // Run the operation
            operation()
                .then((result) => {
                    clearTimeout(timeoutId);
                    this.activeTimeouts.delete(timeoutId);
                    resolve(result);
                })
                .catch((error) => {
                    clearTimeout(timeoutId);
                    this.activeTimeouts.delete(timeoutId);
                    reject(error);
                });
        });
    }

    /**
     * Store HD path in multiple storage locations
     * @param hdPath The HD path to store
     */
    protected async storeHDPath(hdPath: string): Promise<void> {
        // Update cache first
        this.hdPathCache = hdPath;

        try {
            // Store in session storage
            if (chrome.storage?.session) {
                await chrome.storage.session.set({
                    [`${this.device.toLowerCase()}_hd_path`]: {
                        path: hdPath,
                        timestamp: Date.now(),
                        device: this.device
                    }
                });
                log.debug(`Stored HD path ${hdPath} in session storage for ${this.device}`);
            }

            // Store in local storage for persistence
            try {
                const devicePaths = JSON.parse(localStorage.getItem('hardware_hd_paths') || '{}');
                devicePaths[this.device] = hdPath;
                localStorage.setItem('hardware_hd_paths', JSON.stringify(devicePaths));
                log.debug(`Stored HD path ${hdPath} in local storage for ${this.device}`);
            } catch (e) {
                log.warn(`Failed to store HD path in local storage:`, e);
            }
        } catch (error) {
            log.warn(`Error storing HD path:`, error);
            // Non-critical error, continue execution
        }
    }

    /**
     * Cleans up resources when handler is no longer needed
     */
    public async cleanup(): Promise<void> {
        // Clear all active timeouts
        for (const timeoutId of this.activeTimeouts) {
            clearTimeout(timeoutId);
        }
        this.activeTimeouts.clear();

        // Clear cached values
        this.hdPathCache = null;

        log.debug(`Cleaned up resources for ${this.device} handler`);
    }
} 