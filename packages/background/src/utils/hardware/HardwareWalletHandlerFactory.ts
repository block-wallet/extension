import { Devices, IHardwareWalletHandler } from '../types/hardware';
import { LedgerHardwareWalletHandler } from './LedgerHardwareWalletHandler';
import { TrezorHardwareWalletHandler } from './TrezorHardwareWalletHandler';
import log from 'loglevel';

/**
 * Factory class to create hardware wallet handlers
 * Creates and caches the appropriate handler for each device type
 */
export class HardwareWalletHandlerFactory {
    // Cache handlers to avoid recreating them
    private static handlers: Map<Devices, IHardwareWalletHandler> = new Map();

    /**
     * Creates or retrieves a hardware wallet handler for the given device type
     * @param device The hardware wallet device type
     * @param keyringController Reference to the keyring controller
     * @returns The hardware wallet handler
     */
    public static getHandler(device: Devices, keyringController: any): IHardwareWalletHandler {
        // If we have a cached handler, return it
        if (this.handlers.has(device)) {
            return this.handlers.get(device)!;
        }

        // Create a new handler based on device type
        let handler: IHardwareWalletHandler;

        switch (device) {
            case Devices.LEDGER:
                handler = new LedgerHardwareWalletHandler(keyringController);
                break;
            case Devices.TREZOR:
                handler = new TrezorHardwareWalletHandler(keyringController);
                break;
            // case Devices.QR:
            //     handler = new QRHardwareWalletHandler(keyringController);
            //     break;
            default:
                throw new Error(`Unsupported device type: ${device}`);
        }

        // Cache the handler
        this.handlers.set(device, handler);
        log.debug(`Created hardware wallet handler for ${device}`);

        return handler;
    }

    /**
     * Checks if a handler exists for the given device type
     * @param device The hardware wallet device type
     * @returns True if a handler exists
     */
    public static hasHandler(device: Devices): boolean {
        return this.handlers.has(device);
    }

    /**
     * Removes a handler from the cache
     * @param device The hardware wallet device type
     */
    public static removeHandler(device: Devices): void {
        if (this.handlers.has(device)) {
            const handler = this.handlers.get(device)!;
            // Clean up resources
            handler.cleanup().catch(e => {
                log.warn(`Error cleaning up handler for ${device}:`, e);
            });

            // Remove from cache
            this.handlers.delete(device);
            log.debug(`Removed hardware wallet handler for ${device}`);
        }
    }

    /**
     * Cleans up all handlers
     */
    public static cleanup(): void {
        for (const [device, handler] of this.handlers.entries()) {
            try {
                handler.cleanup().catch(e => {
                    log.warn(`Error cleaning up handler for ${device}:`, e);
                });
            } catch (e) {
                log.warn(`Error during handler cleanup for ${device}:`, e);
            }
        }
        this.handlers.clear();
        log.debug('Cleaned up all hardware wallet handlers');
    }
} 