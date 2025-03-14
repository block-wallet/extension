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
                            
                            if (result.success) {
                                resolve(true);
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
        
        const connectedDevices = await navigator.hid.requestDevice({
            filters: [{ vendorId: LEDGER_USB_VENDOR_ID }],
        })

        const approvedDevices = connectedDevices.some(
            (device) => device.vendorId === LEDGER_USB_VENDOR_ID
        )

        if (!approvedDevices) {
            log.error("LEDGER > No device selected with WebHID")
            return false
        }

        log.info("LEDGER > Successfully connected using WebHID")
        return true
    } catch (error) {
        log.error("LEDGER > WebHID connection error:", error)
        
        // Provide more specific error messages
        if (error instanceof DOMException) {
            if (error.name === 'SecurityError') {
                log.error("LEDGER > Permission denied for WebHID");
            } else if (error.name === 'NotFoundError') {
                log.error("LEDGER > No device selected");
            }
        }
        
        throw error
    }
}

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
            // First try to directly request permission to trigger Chrome's permission dialog
            // This ensures the user sees the Chrome dialog before our bridge page
            if (isWebHIDSupported()) {
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
            return await connectWithWebHID()
        } catch (error) {
            log.warn("LEDGER > WebHID connection failed, trying WebUSB...", error)
            // Continue to WebUSB as fallback
        }
    } else {
        log.info("LEDGER > WebHID not supported, trying WebUSB...")
    }

    // Try WebUSB as fallback or primary method if WebHID is not available
    if (isWebUSBSupported()) {
        try {
            return await connectWithWebUSB()
        } catch (error) {
            log.error("LEDGER > WebUSB connection error:", error)
            if (error instanceof DOMException && error.name === "NotFoundError") {
                log.error("LEDGER > No device selected")
                return false
            } else if (error instanceof DOMException && error.name === "SecurityError") {
                log.error("LEDGER > Security error: Permission denied")
                return false
            }
            throw error
        }
    } else {
        // Neither WebHID nor WebUSB is supported
        log.error("LEDGER > Browser does not support WebHID or WebUSB")
        return false
    }
}
