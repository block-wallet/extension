// This script runs in the offscreen document and handles hardware wallet connections

// Initialize status element for debugging
const statusElement = document.getElementById('status');

// Update status for debugging
function updateStatus(message) {
    if (statusElement) {
        statusElement.textContent = message;
        console.log(message);
    }
}

// Store active transport instances
let activeTransports = {
    LEDGER: null
};

// Initialize bridge
function initHardwareWalletBridge() {
    updateStatus('Hardware wallet bridge initialized');

    // Listen for messages from the extension
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'HW_CONNECT_REQUEST') {
            handleHardwareWalletConnection(message.device, message.transportType, sendResponse);
            return true; // Keep the message channel open for async response
        }

        if (message.type === 'HW_DISCONNECT_REQUEST') {
            handleHardwareWalletDisconnection(message.device, sendResponse);
            return true; // Keep the message channel open for async response
        }

        if (message.type === 'HW_STATUS') {
            // Check if we have a cached device and return its status
            const hasActiveDevice = message.device && activeTransports[message.device] !== null;
            sendResponse({
                status: 'ready',
                hasActiveDevice: hasActiveDevice,
                timestamp: Date.now()
            });
            return false;
        }

        if (message.type === 'HW_VERIFY_ETH_APP') {
            verifyEthereumApp(message.device, sendResponse, message.bypassCache);
            return true; // Keep the message channel open for async response
        }
    });

    // Let the extension know the bridge is ready
    chrome.runtime.sendMessage({ type: 'BRIDGE_READY' });

    // Listen for device connect/disconnect events for WebHID
    if (navigator.hid) {
        navigator.hid.addEventListener('connect', (event) => {
            const device = event.device;
            console.log('HID device connected:', device);

            // Check if this is a Ledger device
            if (device.vendorId === 0x2c97) {
                chrome.runtime.sendMessage({
                    type: 'LEDGER_DEVICE_CONNECTED',
                    deviceInfo: {
                        productName: device.productName,
                        productId: device.productId,
                        vendorId: device.vendorId,
                        timestamp: Date.now()
                    }
                });
            }
        });

        navigator.hid.addEventListener('disconnect', (event) => {
            const device = event.device;
            console.log('HID device disconnected:', device);

            // Check if this is a Ledger device
            if (device.vendorId === 0x2c97) {
                chrome.runtime.sendMessage({
                    type: 'LEDGER_DEVICE_DISCONNECTED',
                    deviceInfo: {
                        productName: device.productName,
                        productId: device.productId,
                        vendorId: device.vendorId,
                        timestamp: Date.now()
                    }
                });

                // Clear the active transport
                activeTransports.LEDGER = null;
            }
        });
    }
}

// Handle hardware wallet disconnection
async function handleHardwareWalletDisconnection(deviceType, sendResponse) {
    try {
        updateStatus(`Disconnecting ${deviceType} device...`);

        if (deviceType === 'LEDGER') {
            // If we have a cached device, close it
            if (window.ledgerDevice && window.ledgerDevice.opened) {
                try {
                    await window.ledgerDevice.close();
                    window.ledgerDevice = null;
                } catch (error) {
                    console.warn('Error closing Ledger device:', error);
                }
            }

            // Clear the active transport
            activeTransports.LEDGER = null;
        }

        sendResponse({
            success: true,
            timestamp: Date.now(),
            device: deviceType
        });
    } catch (error) {
        console.error(`Error disconnecting ${deviceType}:`, error);
        sendResponse({
            success: false,
            error: error.message,
            timestamp: Date.now(),
            device: deviceType
        });
    }
}

// Handle hardware wallet connection
async function handleHardwareWalletConnection(deviceType, transportType, sendResponse) {
    try {
        if (deviceType === 'LEDGER' && transportType !== 'webhid') {
            throw new Error('Ledger devices must use WebHID transport only');
        }

        updateStatus(`Connecting to ${deviceType} device using ${transportType || 'default'} transport...`);

        // Different connection logic based on device type
        let result = false;

        switch (deviceType) {
            case 'LEDGER':
                result = await connectLedger();
                break;
            case 'TREZOR':
                result = await connectTrezor();
                break;
            default:
                throw new Error(`Unsupported device type: ${deviceType}`);
        }

        if (result) {
            updateStatus(`Successfully connected to ${deviceType} device`);

            // Create connection info to return to service worker
            const connectionInfo = {
                timestamp: Date.now(),
                connected: true,
                device: deviceType,
                transportType: deviceType === 'LEDGER' ? 'webhid' : transportType,
                source: deviceType === 'LEDGER' ? 'webhid' : 'offscreen',
                deviceInfo: window[`${deviceType.toLowerCase()}Device`] ? {
                    productName: window[`${deviceType.toLowerCase()}Device`].productName,
                    vendorId: window[`${deviceType.toLowerCase()}Device`].vendorId,
                    productId: window[`${deviceType.toLowerCase()}Device`].productId
                } : null
            };

            // Return connection information to service worker to handle storage
            sendResponse({
                success: true,
                connectionInfo: connectionInfo,
                deviceInfo: connectionInfo.deviceInfo,
                // Include explicit permission info for Ledger
                explicitPermission: deviceType === 'LEDGER' ? {
                    granted: true,
                    timestamp: Date.now(),
                    source: 'webhid',
                    fromOffscreen: true
                } : null
            });
        } else {
            updateStatus(`Failed to connect to ${deviceType} device`);
            sendResponse({
                success: false,
                error: 'Connection failed',
                timestamp: Date.now(),
                device: deviceType
            });
        }
    } catch (error) {
        updateStatus(`Error connecting to hardware wallet: ${error.message}`);

        // Create a more detailed error response
        const errorCode = determineErrorCode(error, deviceType);
        const errorResponse = {
            success: false,
            error: error.message,
            errorCode: errorCode,
            timestamp: Date.now(),
            device: deviceType,
            requiresUserGesture: error.requiresUserGesture ||
                (error.message && error.message.includes('user gesture'))
        };

        sendResponse(errorResponse);
    }
}

// Helper function to categorize errors
function determineErrorCode(error, deviceType) {
    if (!error) return 'UNKNOWN_ERROR';

    const msg = error.message || '';

    if (deviceType === 'LEDGER') {
        if (msg.includes('locked') || msg.includes('CONDITIONS_OF_USE_NOT_SATISFIED')) {
            return 'DEVICE_LOCKED';
        } else if (msg.includes('busy') || msg.includes('in use') || msg.includes('already open')) {
            return 'DEVICE_BUSY';
        } else if (msg.includes('permission') || msg.includes('denied') || msg.includes('SecurityError')) {
            return 'PERMISSION_DENIED';
        } else if (msg.includes('timeout') || msg.includes('Timeout') ||
            msg.includes('not in the expected state') ||
            msg.includes('app open')) {
            return 'APP_NOT_OPEN';
        }
    }

    return 'CONNECTION_FAILED';
}

// Connect to Ledger device using WebHID
async function connectLedger() {
    try {
        // This uses the WebHID API which is available in the offscreen context
        if (!navigator.hid) {
            throw new Error('WebHID API not available');
        }

        // First check for existing devices
        const existingDevices = await navigator.hid.getDevices();
        const ledgerDevices = existingDevices.filter(d => d.vendorId === 0x2c97);
        console.log(`Found ${ledgerDevices.length} existing Ledger devices`);

        let device;

        if (ledgerDevices.length > 0) {
            device = ledgerDevices[0];
            console.log('Using existing authorized Ledger device:', device);
        } else {
            try {
                // Request device access - this might fail with SecurityError if not in a user gesture
                const devices = await navigator.hid.requestDevice({
                    filters: [
                        // Ledger device filters
                        { vendorId: 0x2c97 }, // Ledger vendor ID
                        // Add specific product IDs for known Ledger devices
                        { vendorId: 0x2c97, productId: 0x0001 }, // Nano S
                        { vendorId: 0x2c97, productId: 0x4001 }, // Nano X
                        { vendorId: 0x2c97, productId: 0x8000 }  // Nano S Plus
                    ]
                });

                // No devices selected
                if (devices.length === 0) {
                    throw new Error('No Ledger device selected');
                }

                device = devices[0];
                console.log('Selected new Ledger device:', device);
            } catch (requestError) {
                console.error('Error requesting device:', requestError);

                // Check specifically for user gesture errors and provide clear message
                if (requestError instanceof DOMException &&
                    requestError.name === 'SecurityError' &&
                    requestError.message.includes('user gesture')) {

                    // Create a more specific error that the UI can handle appropriately
                    const error = new Error('Must be handling a user gesture to show a permission request');
                    error.code = 'PERMISSION_DENIED';
                    error.requiresUserGesture = true;
                    throw error;
                }

                throw requestError;
            }
        }

        // Try to open the device to ensure it's accessible
        try {
            if (!device.opened) {
                await device.open();
                console.log('Successfully opened Ledger device');
            } else {
                console.log('Device is already open');
            }
        } catch (openError) {
            console.error('Error opening device:', openError);

            // Try closing and reopening if device is already open
            if (openError.message && openError.message.includes('already open')) {
                try {
                    console.log('Attempting to close and reopen device');
                    await device.close();
                    await device.open();
                    console.log('Successfully reopened device');
                } catch (reopenError) {
                    console.error('Error reopening device:', reopenError);
                    throw new Error('Device is in use by another application. Please close other applications using your Ledger (like Ledger Live) and try again.');
                }
            } else {
                throw openError;
            }
        }

        // Store the device connection for later use
        window.ledgerDevice = device;

        console.log('Successfully connected to Ledger device via WebHID');

        return true;
    } catch (error) {
        console.error('Ledger connection error:', error);
        throw error; // Let the caller handle the error
    }
}

// Connect to Trezor device using WebUSB
async function connectTrezor() {
    try {
        // This uses the WebUSB API which is available in the offscreen context
        if (!navigator.usb) {
            throw new Error('WebUSB API not available');
        }

        // Request device access
        const devices = await navigator.usb.requestDevice({
            filters: [
                // Trezor device filters
                { vendorId: 0x1209, productId: 0x53c1 }, // Trezor One
                { vendorId: 0x1209, productId: 0x53c0 }, // Trezor Model T
            ]
        });

        // No devices selected
        if (!devices) {
            return false;
        }

        // Try to open the device
        if (!devices.opened) {
            await devices.open();
        }

        // Claim interface
        await devices.selectConfiguration(1);
        await devices.claimInterface(0);

        // Store the device connection for later use
        window.trezorDevice = devices;
        return true;
    } catch (error) {
        console.error('Trezor connection error:', error);
        return false;
    }
}

// Verify if the Ethereum app is open on the Ledger device
async function verifyEthereumApp(deviceType, sendResponse, bypassCache = false) {
    if (deviceType !== 'LEDGER') {
        sendResponse({
            success: false,
            appOpen: false,
            error: 'Only Ledger devices supported for Ethereum app verification',
            timestamp: Date.now()
        });
        return;
    }

    let responseSent = false;
    let inputListener = null;
    let timeoutId = null;

    console.log('[LEDGER OFFSCREEN] Starting Ethereum app verification');

    // Function to ensure we only send response once and clean up resources
    const safeResponse = (response) => {
        if (!responseSent) {
            responseSent = true;

            // Clean up any listeners and timers
            if (inputListener && window.ledgerDevice) {
                window.ledgerDevice.removeEventListener('inputreport', inputListener);
                console.log('[LEDGER OFFSCREEN] Removed input listener');
            }

            if (timeoutId) {
                clearTimeout(timeoutId);
                console.log('[LEDGER OFFSCREEN] Cleared timeout');
            }

            // Add timestamp to all responses
            const finalResponse = {
                ...response,
                timestamp: Date.now(),
                device: deviceType
            };

            // Send response back to service worker
            console.log('[LEDGER OFFSCREEN] Sending response back:', finalResponse);
            sendResponse(finalResponse);
        }
    };

    try {
        updateStatus('Verifying Ethereum app is open...');

        // Check if we have an active transport
        if (!window.ledgerTransport && !window.ledgerDevice) {
            // Try to reconnect if we don't have an active device
            try {
                await connectLedger();
            } catch (error) {
                logMessage(`Failed to reconnect to Ledger: ${error.message}`, true);
                safeResponse({
                    success: false,
                    appOpen: false,
                    error: 'No active Ledger connection available'
                });
                return;
            }
        }

        // Create a promise that represents the actual verification logic
        const verificationPromise = new Promise(async (resolve, reject) => {
            try {
                // Get the device
                let hidDevice = window.ledgerDevice;

                if (!hidDevice) {
                    const devices = await navigator.hid.getDevices();
                    const ledgerDevices = devices.filter(d => d.vendorId === 0x2c97);

                    if (ledgerDevices.length === 0) {
                        reject(new Error('No Ledger device found'));
                        return;
                    }

                    hidDevice = ledgerDevices[0];
                    window.ledgerDevice = hidDevice;
                }

                if (!hidDevice.opened) {
                    await hidDevice.open();
                }

                console.log('[LEDGER OFFSCREEN] Device ready, sending APDU command to verify Ethereum app');

                // APDU command for Ethereum getAppConfig: CLA=0xe0, INS=0x06, P1=0x00, P2=0x00
                const commandData = new Uint8Array([0xe0, 0x06, 0x00, 0x00]);

                // Prepare the HID report
                const channel = 0x0101; // Default channel
                const tag = 0x05;       // APDU tag

                // Format the command as per Ledger WebHID protocol
                // 64-byte buffer: 5-byte header + 2-byte length + data (padded to 64 bytes)
                const buffer = new Uint8Array(64);

                // Standard 5-byte header
                buffer[0] = channel >> 8;   // Channel ID high byte
                buffer[1] = channel & 0xff; // Channel ID low byte
                buffer[2] = tag;            // Command tag (0x05 for APDU)
                buffer[3] = 0x00;           // Sequence index high byte (0 for first packet)
                buffer[4] = 0x00;           // Sequence index low byte (0 for first packet)

                // 2-byte data length (big endian)
                buffer[5] = 0x00;              // APDU length high byte (0 for short commands)
                buffer[6] = commandData.length; // APDU length low byte

                // Copy APDU command data
                for (let i = 0; i < commandData.length; i++) {
                    buffer[7 + i] = commandData[i];
                }

                // Listen for response
                const responsePromise = new Promise((resolveResponse, rejectResponse) => {
                    inputListener = (event) => {
                        const data = new Uint8Array(event.data.buffer);
                        // Enhanced logging to show full response
                        console.log(`[LEDGER OFFSCREEN] Received raw response data (${data.length} bytes):`, Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
                        console.log('[LEDGER OFFSCREEN] Received response from device');

                        // Simple check - if we got a response with status words 0x9000 (success),
                        // we know the Ethereum app is open
                        const lastTwoBytes = (data[data.length - 2] << 8) | data[data.length - 1];
                        console.log(`[LEDGER OFFSCREEN] Response status: 0x${lastTwoBytes.toString(16)}`);

                        if (lastTwoBytes === 0x9000) {
                            console.log('[LEDGER OFFSCREEN] Status 0x9000 confirms Ethereum app is open');
                            resolveResponse(true);
                        } else {
                            // Enhanced error reporting for non-9000 status words
                            const knownErrors = {
                                '6700': 'Incorrect length',
                                '6982': 'Security status not satisfied (device locked?)',
                                '6985': 'Conditions not satisfied (Ethereum app not open?)',
                                '6a80': 'Invalid data',
                                '6a82': 'File not found',
                                '6a86': 'Incorrect P1/P2 parameters',
                                '6d00': 'INS not supported (wrong app open?)',
                                '6e00': 'CLA not supported (wrong app open?)'
                            };

                            const hexStatus = lastTwoBytes.toString(16).padStart(4, '0');
                            const errorDesc = knownErrors[hexStatus] || 'Unknown error';
                            console.error(`[LEDGER OFFSCREEN] Verification failed with status 0x${hexStatus}: ${errorDesc}`);

                            rejectResponse(new Error(`Unexpected response from device: 0x${hexStatus} - ${errorDesc}`));
                        }
                    };

                    hidDevice.addEventListener('inputreport', inputListener);
                    console.log('[LEDGER OFFSCREEN] Added input listener, sending command to device');

                    // Send the command
                    hidDevice.sendReport(0, buffer)
                        .then(() => console.log('[LEDGER OFFSCREEN] Command sent successfully'))
                        .catch(error => {
                            console.error('[LEDGER OFFSCREEN] Failed to send command:', error);
                            rejectResponse(error);
                        });
                });

                // Wait for response or error
                const result = await responsePromise;
                resolve(result);
            } catch (error) {
                console.error('[LEDGER OFFSCREEN] Verification error:', error);
                reject(error);
            }
        });

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                console.log('[LEDGER OFFSCREEN] Internal verification timeout (15s) reached');
                reject(new Error('Ethereum app verification timed out'));
            }, 15000); // 15 second timeout (increased from 5s)
        });

        try {
            console.log('[LEDGER OFFSCREEN] Starting Promise.race between verification and timeout');
            // Race the verification against the timeout
            const result = await Promise.race([verificationPromise, timeoutPromise]);

            // Success - Ethereum app is open
            updateStatus('Ethereum app is open on Ledger device');
            safeResponse({
                success: true,
                appOpen: true,
                ethAppStatus: {
                    open: true,
                    timestamp: Date.now(),
                    source: 'offscreen_verification_success'
                }
            });
        } catch (raceError) {
            console.error('[LEDGER OFFSCREEN] Race error:', raceError);

            // Enhanced error diagnosis
            if (raceError.message === 'Ethereum app verification timed out') {
                console.log('[LEDGER OFFSCREEN] Failure cause: No response received within timeout period. Device might be unresponsive or disconnected.');

                // Log device state for diagnostics
                if (window.ledgerDevice) {
                    const device = window.ledgerDevice;
                    console.log(
                        `[LEDGER OFFSCREEN] Device diagnostic info:
                        - Vendor ID: 0x${device.vendorId.toString(16)}
                        - Product ID: 0x${device.productId.toString(16)}
                        - Product Name: ${device.productName || 'Unknown'}
                        - Opened: ${device.opened}`
                    );

                    // Check if device might be in another mode or app
                    console.log(
                        `[LEDGER OFFSCREEN] Possible causes: 
                        - Ethereum app is not actually open (even if unlocked)
                        - Device is still in the device selection screen
                        - Device is showing a confirmation dialog
                        - Device firmware may need updating
                        - WebHID connection may need to be reestablished`
                    );
                }
            } else if (raceError.message.includes('Unexpected response from device')) {
                console.log('[LEDGER OFFSCREEN] Failure cause: Device responded but with error status. Ethereum app might not be open or ready.');
            } else {
                console.log('[LEDGER OFFSCREEN] Failure cause: Error during communication:', raceError.message);
            }

            // Critical fix: Call safeResponse here to ensure we always respond
            safeResponse({
                success: false,
                appOpen: false,
                error: raceError.message,
                // Provide detailed status information for the service worker to store
                ethAppStatus: {
                    open: false,
                    timestamp: Date.now(),
                    error: raceError.message,
                    source: raceError.message === 'Ethereum app verification timed out'
                        ? 'offscreen_verification_timeout'
                        : 'offscreen_verification_unexpected_response'
                }
            });
        }
    } catch (error) {
        console.error('[LEDGER OFFSCREEN] Error verifying Ethereum app:', error);
        logMessage(`Error verifying Ethereum app: ${error.message}`, true);

        safeResponse({
            success: false,
            appOpen: false,
            error: error.message,
            ethAppStatus: {
                open: false,
                timestamp: Date.now(),
                error: error.message,
                source: 'offscreen_try_catch'
            }
        });
    }
}

// Initialize the bridge when the offscreen document loads
document.addEventListener('DOMContentLoaded', initHardwareWalletBridge);

// Let the extension know if the window is closing
window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage({ type: 'BRIDGE_CLOSING' });
}); 