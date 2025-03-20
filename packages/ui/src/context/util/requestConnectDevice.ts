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
                    } catch (openError) {
                        log.warn(`LEDGER > Could not open existing device:`, openError);

                        // Try to close and reopen problematic devices
                        try {
                            log.debug(`LEDGER > Attempting to close and reopen problematic device`);
                            await device.close().catch(e => log.warn(`LEDGER > Error closing device:`, e));
                            await device.open();
                            log.debug(`LEDGER > Successfully reopened device after close`);
                        } catch (reopenError) {
                            log.warn(`LEDGER > Failed to reopen device after close:`, reopenError);
                        }
                    }
                }

                return true;
            } else {
                log.debug("LEDGER > No approved Ledger devices found among existing devices");
            }
        } catch (e) {
            log.warn("LEDGER > Could not check for existing approved devices:", e);
            // Continue with requesting new devices
        }

        // Request permission for new devices with more detailed filter
        log.debug("LEDGER > Showing device selection dialog to user");
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
            } catch (openError) {
                log.warn(`LEDGER > Could not open device:`, openError);
                // Try alternative approach - close and reopen
                try {
                    log.debug("LEDGER > Attempting to close and reopen device");
                    await device.close().catch(e => log.warn("LEDGER > Error closing device:", e));
                    await device.open();
                    log.debug("LEDGER > Successfully reopened device after close");
                } catch (reopenError) {
                    log.warn("LEDGER > Failed to reopen device after close:", reopenError);
                    // Continue anyway - the transport layer will handle opening
                }
            }
        }

        return true;
    } catch (error) {
        log.error("LEDGER > WebHID connection error:", error);

        // Provide more specific error messages
        if (error instanceof DOMException) {
            if (error.name === 'SecurityError') {
                log.error("LEDGER > Permission denied for WebHID");
                throw new Error("Permission denied. Please allow access to your Ledger device.");
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

    // For Manifest V3 extension, try direct connection first to trigger Chrome's permission dialog
    if (isManifestV3) {
        try {
            // First try to check for already approved devices before showing any UI
            if (isWebHIDSupported()) {
                try {
                    const existingDevices = await navigator.hid.getDevices();
                    const approvedExistingDevices = existingDevices.filter(device => device.vendorId === LEDGER_USB_VENDOR_ID);

                    if (approvedExistingDevices.length > 0) {
                        log.info(`LEDGER > Found ${approvedExistingDevices.length} already approved Ledger devices, skipping permission dialog`);
                        // We already have permissions, proceed with bridge for the connection logic
                        return await openHardwareWalletBridge("LEDGER");
                    }
                } catch (e) {
                    log.warn("LEDGER > Could not check for existing approved devices:", e);
                    // Continue with requesting new devices
                }

                log.debug("LEDGER > Requesting initial WebHID permission to trigger Chrome dialog");
                try {
                    // This will show the Chrome device selection dialog
                    const directResult = await navigator.hid.requestDevice({
                        filters: [{ vendorId: LEDGER_USB_VENDOR_ID }],
                    });

                    // If we got here, the user approved a device in Chrome's dialog
                    if (directResult && directResult.length > 0) {
                        log.debug("LEDGER > User approved device in Chrome dialog, proceeding with bridge");

                        // Now open the bridge page for the full connection flow
                        // The bridge page will now be able to access the already-approved device
                        return await openHardwareWalletBridge("LEDGER");
                    } else {
                        log.warn("LEDGER > No devices selected in Chrome dialog");
                        return false;
                    }
                } catch (error) {
                    if (error instanceof DOMException && error.name === "SecurityError") {
                        log.error("LEDGER > Permission denied in Chrome dialog");
                        throw new Error("Permission denied. Please allow access to your Ledger device.");
                    }

                    log.warn("LEDGER > Initial WebHID request failed, trying bridge approach", error);
                    // If the direct approach failed for any other reason, try the bridge as fallback
                    return await openHardwareWalletBridge("LEDGER");
                }
            } else {
                // If WebHID is not supported, use the bridge directly
                log.debug("LEDGER > WebHID not supported, using hardware wallet bridge directly");
                return await openHardwareWalletBridge("LEDGER");
            }
        } catch (error) {
            log.warn("LEDGER > Bridge connection failed, falling back to direct approach", error);
            // Continue to direct connection methods as fallback
        }
    }

    // Direct WebHID/WebUSB connection for non-MV3 or as fallback

    // First try WebHID if supported
    if (isWebHIDSupported()) {
        try {
            return await connectWithWebHID();
        } catch (error) {
            log.warn("LEDGER > WebHID connection failed, trying WebUSB if available", error);

            // If specific errors, don't try fallbacks
            if (error instanceof DOMException && (error.name === "SecurityError" || error.name === "NotFoundError")) {
                throw error; // Rethrow specific errors that wouldn't be solved by fallbacks
            }

            // Try WebUSB as fallback if supported
            if (isWebUSBSupported()) {
                return await connectWithWebUSB();
            } else {
                throw new Error("No compatible connection method available for Ledger. Please use Chrome or Edge browser.");
            }
        }
    } else if (isWebUSBSupported()) {
        // If WebHID is not available but WebUSB is, try it
        return await connectWithWebUSB();
    } else {
        // Neither WebHID nor WebUSB is supported
        throw new Error("Your browser does not support WebHID or WebUSB. Please use Chrome or Edge.");
    }
}
