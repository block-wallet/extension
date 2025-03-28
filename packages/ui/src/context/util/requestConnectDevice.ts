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
 * using WebHID with fallback to WebUSB if WebHID is not supported
 * @returns boolean if user granted permissions to a device
 */
export const requestConnectDevice = async (): Promise<boolean> => {
    // First check if we're in a Manifest V3 extension context
    const isExtensionContext = !!(window.chrome && chrome.runtime && chrome.runtime.id);
    const isManifestV3 = isExtensionContext && (chrome.runtime.getManifest().manifest_version === 3);

    log.debug(`LEDGER > Connection context: Extension=${isExtensionContext}, MV3=${isManifestV3}`);

    let connectionSuccess = false;
    let lastError: Error | null = null;
    let attemptCount = 0;

    // Try multiple times with exponential backoff
    while (!connectionSuccess && attemptCount < MAX_CONNECTION_RETRIES) {
        attemptCount++;

        try {
            log.debug(`LEDGER > Connection attempt ${attemptCount}/${MAX_CONNECTION_RETRIES}`);

            // Attempt connection with WebHID first if supported
            if (isWebHIDSupported()) {
                try {
                    log.debug(`LEDGER > Attempting WebHID connection`);
                    connectionSuccess = await connectWithWebHID();

                    if (connectionSuccess) {
                        log.debug(`LEDGER > WebHID connection successful`);

                        // Update connection status in session storage
                        if (chrome.storage?.session) {
                            try {
                                await chrome.storage.session.set({
                                    'ledger_connection_status': {
                                        connected: true,
                                        timestamp: Date.now(),
                                        method: 'webhid'
                                    }
                                });

                                // Also set explicit permission flag
                                await chrome.storage.session.set({
                                    'ledger_explicit_permission': {
                                        granted: true,
                                        timestamp: Date.now(),
                                        source: 'requestDevice'
                                    }
                                });

                                log.debug(`LEDGER > Updated connection status in session storage`);
                            } catch (storageError) {
                                log.error(`LEDGER > Failed to update connection status:`, storageError);
                            }
                        }

                        break;
                    }
                } catch (error) {
                    lastError = error;
                    log.warn(`LEDGER > WebHID connection failed:`, error);

                    // Don't fallback to WebUSB right away, we'll retry WebHID first
                    if (error.name === 'SecurityError') {
                        log.debug(`LEDGER > WebHID permission denied, cannot retry automatically`);
                        // Don't retry if permission denied - user needs to try again
                        break;
                    }
                }
            } else if (isWebUSBSupported()) {
                // Fall back to WebUSB if WebHID is not supported
                try {
                    log.debug(`LEDGER > Attempting WebUSB connection (fallback)`);
                    connectionSuccess = await connectWithWebUSB();

                    if (connectionSuccess) {
                        log.debug(`LEDGER > WebUSB connection successful`);

                        // Update connection status in session storage
                        if (chrome.storage?.session) {
                            try {
                                await chrome.storage.session.set({
                                    'ledger_connection_status': {
                                        connected: true,
                                        timestamp: Date.now(),
                                        method: 'webusb'
                                    }
                                });

                                log.debug(`LEDGER > Updated connection status in session storage`);
                            } catch (storageError) {
                                log.error(`LEDGER > Failed to update connection status:`, storageError);
                            }
                        }

                        break;
                    }
                } catch (error) {
                    lastError = error;
                    log.warn(`LEDGER > WebUSB connection failed:`, error);
                }
            } else {
                // Neither WebHID nor WebUSB is supported
                log.error(`LEDGER > Neither WebHID nor WebUSB is supported in this browser`);
                lastError = new Error('Your browser does not support hardware wallet connections');
                break;
            }

            // If we've failed, wait before trying again (exponential backoff)
            if (!connectionSuccess && attemptCount < MAX_CONNECTION_RETRIES) {
                const delayMs = 500 * Math.pow(2, attemptCount - 1);
                log.debug(`LEDGER > Retrying in ${delayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        } catch (error) {
            lastError = error;
            log.error(`LEDGER > Unexpected error during connection attempt:`, error);

            // Wait before retrying
            if (attemptCount < MAX_CONNECTION_RETRIES) {
                const delayMs = 500 * Math.pow(2, attemptCount - 1);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    // If we failed after all retries, log the detailed error and update storage
    if (!connectionSuccess && lastError) {
        log.error(`LEDGER > All connection attempts failed:`, lastError);

        // Store error in session storage for the service worker to detect
        if (chrome.storage?.session) {
            try {
                await chrome.storage.session.set({
                    'ledger_connection_error': {
                        error: lastError.message,
                        timestamp: Date.now(),
                        attemptsMade: attemptCount
                    }
                });
            } catch (storageError) {
                log.error(`LEDGER > Failed to store error in session storage:`, storageError);
            }
        }
    }

    return connectionSuccess;
};

/**
 * Attempts to connect to a LEDGER device using WebHID API
 * @returns boolean indicating if connection was successful
 */
export const connectWithWebHID = async (): Promise<boolean> => {
    try {
        log.debug("LEDGER > Requesting device with WebHID...");
        log.debug(`LEDGER > WebHID supported: ${isWebHIDSupported()}`);

        // First check if any approved devices are already available
        try {
            const existingDevices = await navigator.hid.getDevices();
            log.debug(`LEDGER > Found ${existingDevices.length} total HID devices`);

            // Log all device details to help with debugging
            existingDevices.forEach((device, index) => {
                log.debug(`LEDGER > Device ${index + 1}: vendorId=0x${device.vendorId.toString(16)}, productId=0x${device.productId.toString(16)}, productName=${device.productName || 'Unknown'}`);
            });

            const approvedExistingDevices = existingDevices.filter(device => device.vendorId === LEDGER_USB_VENDOR_ID);

            if (approvedExistingDevices.length > 0) {
                log.info(`LEDGER > Found ${approvedExistingDevices.length} already approved Ledger devices`);

                // Try to open all existing Ledger devices to ensure they're accessible
                for (const device of approvedExistingDevices) {
                    try {
                        if (!device.opened) {
                            log.debug(`LEDGER > Opening existing device ${device.productName || 'Unknown'}`);
                            await device.open();
                            log.debug(`LEDGER > Successfully opened device ${device.productName || 'Unknown'}`);
                        } else {
                            log.debug(`LEDGER > Device ${device.productName || 'Unknown'} is already open`);
                        }

                        // If we've successfully opened a device, return true
                        return true;
                    } catch (openError) {
                        log.warn(`LEDGER > Could not open existing device:`, openError);

                        // Try to close and reopen problematic devices
                        try {
                            log.debug(`LEDGER > Attempting to close and reopen problematic device`);
                            await device.close().catch(e => log.warn(`LEDGER > Error closing device:`, e));
                            await device.open();
                            log.debug(`LEDGER > Successfully reopened device after close`);
                            return true;
                        } catch (reopenError) {
                            log.warn(`LEDGER > Failed to reopen device after close:`, reopenError);
                            // Continue trying with other devices or request new ones
                        }
                    }
                }
            } else {
                log.debug("LEDGER > No approved Ledger devices found among existing devices");
            }
        } catch (e) {
            log.warn("LEDGER > Could not check for existing approved devices:", e);

            // Check if this is a user gesture error
            if (e instanceof DOMException && e.name === 'SecurityError' && e.message.includes('user gesture')) {
                log.error("LEDGER > User gesture required for WebHID operation:", e);
                throw e; // Preserve the original error
            }

            // Continue with requesting new devices
        }

        // Request permission for new devices with more detailed filter
        log.debug("LEDGER > Showing device selection dialog to user");

        try {
            const connectedDevices = await navigator.hid.requestDevice({
                filters: [
                    { vendorId: LEDGER_USB_VENDOR_ID },
                    // Add specific product IDs for known Ledger devices
                    { vendorId: LEDGER_USB_VENDOR_ID, productId: 0x0001 }, // Nano S
                    { vendorId: LEDGER_USB_VENDOR_ID, productId: 0x4001 }, // Nano X
                    { vendorId: LEDGER_USB_VENDOR_ID, productId: 0x8000 }  // Nano S Plus
                ],
            });

            log.debug(`LEDGER > User selected ${connectedDevices.length} devices from dialog`);

            // Log details of selected devices
            connectedDevices.forEach((device, index) => {
                log.debug(`LEDGER > Selected device ${index + 1}: vendorId=0x${device.vendorId.toString(16)}, productId=0x${device.productId.toString(16)}, productName=${device.productName || 'Unknown'}`);
            });

            const approvedDevices = connectedDevices.filter(
                (device) => device.vendorId === LEDGER_USB_VENDOR_ID
            );

            if (approvedDevices.length === 0) {
                log.error("LEDGER > No device selected with WebHID");
                return false;
            }

            log.info(`LEDGER > Successfully connected to ${approvedDevices.length} devices using WebHID`);

            // Try to open the device to ensure it's accessible
            for (const device of approvedDevices) {
                try {
                    if (!device.opened) {
                        log.debug(`LEDGER > Opening device ${device.productName || 'Unknown'}`);
                        await device.open();
                        log.debug(`LEDGER > Successfully opened device ${device.productName || 'Unknown'}`);
                    } else {
                        log.debug(`LEDGER > Device ${device.productName || 'Unknown'} is already open`);
                    }

                    // If we've successfully opened at least one device, update connection status
                    try {
                        if (chrome.storage?.session) {
                            await chrome.storage.session.set({
                                'ledger_connection_status': {
                                    connected: true,
                                    timestamp: Date.now(),
                                    method: 'webhid',
                                    vendorId: device.vendorId,
                                    productId: device.productId,
                                    productName: device.productName || 'Unknown Ledger'
                                }
                            });

                            // Also set explicit permission flag
                            await chrome.storage.session.set({
                                'ledger_explicit_permission': {
                                    granted: true,
                                    timestamp: Date.now(),
                                    source: 'requestDevice'
                                }
                            });

                            log.debug(`LEDGER > Updated connection status in session storage`);
                        }
                    } catch (storageError) {
                        log.error(`LEDGER > Failed to update connection status:`, storageError);
                    }

                    return true;
                } catch (openError) {
                    log.warn(`LEDGER > Could not open device:`, openError);

                    // Try alternative approach - close and reopen
                    try {
                        log.debug("LEDGER > Attempting to close and reopen device");
                        await device.close().catch(e => log.warn("LEDGER > Error closing device:", e));
                        await device.open();
                        log.debug("LEDGER > Successfully reopened device after close");
                        return true;
                    } catch (reopenError) {
                        log.warn("LEDGER > Failed to reopen device after close:", reopenError);
                        // Continue trying with other devices
                    }
                }
            }
        } catch (requestError) {
            // Handle specific error for user gesture requirement
            if (requestError instanceof DOMException &&
                requestError.name === 'SecurityError' &&
                requestError.message.includes('user gesture')) {
                log.error("LEDGER > User gesture required for WebHID permission:", requestError);
                throw requestError; // Preserve the original error with the specific message
            }

            throw requestError; // Re-throw other errors
        }

        // If we get here, we were unable to open any devices
        log.error("LEDGER > Could not open any of the selected devices");
        return false;
    } catch (error) {
        log.error("LEDGER > WebHID connection error:", error);

        // Provide more specific error messages
        if (error instanceof DOMException) {
            if (error.name === 'SecurityError') {
                if (error.message.includes('user gesture')) {
                    log.error("LEDGER > Permission denied - user gesture required for WebHID");
                    throw error; // Preserve the original error with the specific message
                } else {
                    log.error("LEDGER > Permission denied for WebHID");
                    throw new Error("Permission denied. Please allow access to your Ledger device.");
                }
            } else if (error.name === 'NotFoundError') {
                log.error("LEDGER > No device selected");
                throw new Error("No Ledger device selected. Please make sure your device is connected and unlocked.");
            } else if (error.name === 'NetworkError') {
                log.error("LEDGER > Network error when connecting to device");
                throw new Error("Could not communicate with Ledger. Please reconnect your device.");
            }
        }

        throw error;
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
