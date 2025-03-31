import log from "loglevel"

const LEDGER_USB_VENDOR_ID = 0x2c97

/**
 * Checks if WebHID API is supported in the current browser
 * @returns boolean indicating if WebHID is supported
 */
export const isWebHIDSupported = (): boolean => {
    return !!(navigator && 'hid' in navigator)
}

/**
 * Checks if WebUSB API is supported in the current browser
 * @returns boolean indicating if WebUSB is supported
 */
export const isWebUSBSupported = (): boolean => {
    return !!(navigator && 'usb' in navigator)
}

/**
 * Maximum number of retries for WebHID connection
 */
const MAX_CONNECTION_RETRIES = 3;

/**
 * Opens the hardware wallet bridge page in a new tab
 * @param deviceType The type of device (e.g., 'LEDGER')
 * @returns Promise that resolves when connection succeeds or rejects on failure
 */
export const openHardwareWalletBridge = async (deviceType: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        try {
            const bridgeUrl = chrome.runtime.getURL(`hardware-wallet-bridge.html?device=${deviceType}`);

            // Create storage event listener to get result from bridge page
            const storageListener = (event: StorageEvent) => {
                if (event.key === 'hw_bridge_result') {
                    try {
                        const result = JSON.parse(event.newValue || '{}');

                        // Only process recent results (within last 30 seconds)
                        const isRecent = Date.now() - (result.timestamp || 0) < 30000;

                        if (isRecent && result.device && result.device.toUpperCase() === deviceType) {
                            window.removeEventListener('storage', storageListener);
                            clearTimeout(timeoutId);
                            clearInterval(checkClosed);

                            if (result.success) {
                                resolve(true);
                            } else if (result.userCancelled) {
                                // If user explicitly cancelled or closed the window, don't show an error
                                log.debug(`HARDWARE WALLET > User cancelled or closed ${deviceType} connection window`);
                                resolve(false);  // Resolve with false instead of rejecting
                            } else {
                                reject(new Error(result.error || 'Connection failed'));
                            }
                        }
                    } catch (e) {
                        log.error("Error processing bridge result:", e);
                    }
                }
            };

            // Listen for storage events from the bridge page
            window.addEventListener('storage', storageListener);

            // Set a timeout to avoid hanging indefinitely
            const timeoutId = setTimeout(() => {
                window.removeEventListener('storage', storageListener);
                reject(new Error('Connection timed out'));
            }, 60000); // 60 second timeout

            // Open the bridge page in a popup
            const popup = window.open(bridgeUrl, 'hw_bridge',
                'width=500,height=600,resizable=yes,scrollbars=yes,status=yes');

            if (!popup) {
                window.removeEventListener('storage', storageListener);
                clearTimeout(timeoutId);
                reject(new Error('Popup blocked. Please allow popups for this site.'));
            }

            // Also check for popup close
            const checkClosed = setInterval(() => {
                if (popup && popup.closed) {
                    clearInterval(checkClosed);
                    clearTimeout(timeoutId);
                    window.removeEventListener('storage', storageListener);
                    reject(new Error('Connection window was closed'));
                }
            }, 1000);
        } catch (error) {
            log.error("LEDGER > Failed to open hardware wallet bridge:", error);
            reject(error);
        }
    });
}

/**
 * User gesture to request access to connected LEDGER devices
 * using WebHID. This MUST be called directly from a user interaction handler (e.g., onClick).
 * @returns boolean indicating if user granted permission to at least one device.
 */
export const requestLedgerDevicePermission = async (): Promise<boolean> => {
    log.debug('LEDGER > Requesting device permission via WebHID...');

    if (!isWebHIDSupported()) {
        log.error('LEDGER > WebHID not supported.');
        throw new Error('WebHID is not supported in this browser.');
    }

    try {
        // Request device access - this MUST be in a user gesture context
        const devices = await navigator.hid.requestDevice({
            filters: [
                // Ledger device filters
                { vendorId: LEDGER_USB_VENDOR_ID }
            ]
        });

        // If devices array is not empty, user selected a device and granted permission
        if (devices.length > 0) {
            log.debug(`LEDGER > Permission granted for ${devices.length} device(s). Device 0: ${devices[0].productName}`);

            // We don't need to keep the device object here, 
            // the background will use getDevices() later.
            // Just confirm permission was granted.

            // Store explicit permission flag in session storage for background
            if (chrome.storage?.session) {
                try {
                    await chrome.storage.session.set({
                        'ledger_explicit_permission': {
                            granted: true,
                            timestamp: Date.now(),
                            source: 'requestLedgerDevicePermission'
                        }
                    });
                    log.debug(`LEDGER > Stored explicit permission flag in session storage.`);
                } catch (storageError) {
                    log.error(`LEDGER > Failed to store explicit permission flag:`, storageError);
                }
            }

            return true;
        } else {
            // User cancelled the prompt
            log.warn('LEDGER > No device selected by user.');
            return false;
        }
    } catch (error) {
        log.error('LEDGER > Error requesting device permission:', error);

        // Handle specific errors like user cancellation or other issues
        if (error.name === 'NotFoundError') {
            log.warn('LEDGER > Device request prompt cancelled or no device found.');
            return false;
        } else if (error.name === 'SecurityError') {
            log.error('LEDGER > SecurityError requesting device. Ensure this is called from a user gesture.');
            // Re-throw specific error for UI to handle potentially
            throw new Error('SecurityError: Hardware wallet permission request requires a direct user action.');
        }

        // Re-throw other errors
        throw error;
    }
};

/**
 * Connects to a Ledger device using WebHID. 
 * Assumes permission has already been granted.
 * @returns boolean indicating connection success
 */
export const connectWithWebHID = async (): Promise<boolean> => {
    log.debug('LEDGER > Connecting with WebHID (assuming permission granted)...');
    if (!isWebHIDSupported()) {
        log.error('LEDGER > WebHID not supported.');
        return false;
    }

    try {
        // Get devices user has already granted permission to
        const devices = await navigator.hid.getDevices();
        const ledgerDevices = devices.filter(d => d.vendorId === LEDGER_USB_VENDOR_ID);

        if (ledgerDevices.length === 0) {
            log.warn('LEDGER > No permitted Ledger device found via getDevices().');
            // This case might indicate permission was revoked or device disconnected after permission grant.
            // Or potentially the permission grant didn't register correctly.
            // Maybe try requestDevice as a fallback IF we are certain we are in a user gesture?
            // For now, we return false as the primary flow expects permission first.
            return false;
        }

        const device = ledgerDevices[0];
        log.debug(`LEDGER > Found permitted device: ${device.productName}`);

        // Open the device if not already open
        if (!device.opened) {
            log.debug(`LEDGER > Opening device...`);
            await device.open();
        }
        log.debug(`LEDGER > Device opened successfully.`);

        // Note: We don't return the device object. The background/offscreen script
        // will perform its own getDevices() and open() call.
        // This function just verifies we *can* connect after permission grant.

        return true;
    } catch (error) {
        log.error('LEDGER > Error connecting via WebHID (getDevices/open):', error);
        // Handle potential errors during open()
        return false;
    }
};

/**
 * Attempts to connect to a LEDGER device using WebUSB API
 * @returns boolean indicating if connection was successful
 */
export const connectWithWebUSB = async (): Promise<boolean> => {
    try {
        log.debug("LEDGER > Requesting device with WebUSB...");

        // Safe access to navigator.usb - we already checked it exists in isWebUSBSupported()
        // @ts-ignore - TypeScript doesn't know about the WebUSB API
        const device = await navigator.usb.requestDevice({
            filters: [{ vendorId: LEDGER_USB_VENDOR_ID }]
        })

        if (!device || device.vendorId !== LEDGER_USB_VENDOR_ID) {
            log.error("LEDGER > No device selected with WebUSB")
            return false
        }

        log.info("LEDGER > Successfully connected using WebUSB")
        return true
    } catch (error) {
        log.error("LEDGER > WebUSB connection error:", error)

        // Provide more specific error messages
        if (error instanceof DOMException) {
            if (error.name === 'SecurityError') {
                log.error("LEDGER > Permission denied for WebUSB");
            } else if (error.name === 'NotFoundError') {
                log.error("LEDGER > No device selected");
            }
        }

        throw error
    }
}
