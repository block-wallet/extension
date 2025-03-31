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

        sendResponse({ success: true });
    } catch (error) {
        console.error(`Error disconnecting ${deviceType}:`, error);
        sendResponse({ success: false, error: error.message });
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

            // Update session storage with connection status
            try {
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
                chrome.storage.session.set({
                    [`${deviceType.toLowerCase()}_connection_status`]: connectionInfo
                });

                sendResponse({
                    success: true,
                    deviceInfo: connectionInfo.deviceInfo
                });
            } catch (storageError) {
                console.error(`Error updating session storage:`, storageError);
                sendResponse({ success: true });
            }
        } else {
            updateStatus(`Failed to connect to ${deviceType} device`);
            sendResponse({ success: false, error: 'Connection failed' });
        }
    } catch (error) {
        updateStatus(`Error connecting to hardware wallet: ${error.message}`);

        // Create a more detailed error response
        const errorResponse = {
            success: false,
            error: error.message,
            errorCode: determineErrorCode(error, deviceType),
            timestamp: Date.now()
        };

        // Also update session storage with error state
        try {
            chrome.storage.session.set({
                [`${deviceType.toLowerCase()}_connection_error`]: errorResponse
            });
        } catch (storageError) {
            console.error(`Error updating session storage:`, storageError);
        }

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

                    // Store the error state in session storage
                    try {
                        await chrome.storage.session.set({
                            'ledger_connection_error': {
                                error: error.message,
                                code: 'PERMISSION_DENIED',
                                requiresUserGesture: true,
                                timestamp: Date.now()
                            }
                        });
                    } catch (storageError) {
                        console.error('Failed to store user gesture error in session storage:', storageError);
                    }

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

        // Store connection status in session storage
        try {
            await chrome.storage.session.set({
                'ledger_connection_status': {
                    connected: true,
                    timestamp: Date.now(),
                    source: 'webhid',
                    transportType: 'webhid',
                    deviceInfo: {
                        productName: device.productName || 'Unknown Ledger',
                        vendorId: device.vendorId,
                        productId: device.productId
                    }
                }
            });

            // Also set explicit permission flag
            await chrome.storage.session.set({
                'ledger_explicit_permission': {
                    granted: true,
                    timestamp: Date.now(),
                    source: 'webhid',
                    fromOffscreen: true
                }
            });

            console.log('Updated Ledger WebHID connection status in session storage');
        } catch (storageError) {
            console.warn('Failed to update session storage:', storageError);
        }

        return true;
    } catch (error) {
        console.error('Ledger connection error:', error);

        // Update connection error in session storage with more detailed information
        try {
            const errorCode = determineErrorCode(error, 'LEDGER');
            const errorData = {
                error: error.message,
                timestamp: Date.now(),
                errorCode: errorCode,
                requiresUserGesture: error.requiresUserGesture ||
                    (error.message && error.message.includes('user gesture'))
            };

            await chrome.storage.session.set({
                'ledger_connection_error': errorData
            });

            // Also notify the background script about this error
            chrome.runtime.sendMessage({
                type: 'LEDGER_CONNECTION_ERROR',
                error: errorData
            }).catch(e => console.warn('Failed to send error message to background:', e));

        } catch (storageError) {
            console.warn('Failed to update session storage with error:', storageError);
        }

        throw error;
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
        sendResponse({ success: false, error: 'Device type not supported for app verification' });
        return;
    }

    try {
        updateStatus('Verifying Ethereum app is open on Ledger device...');
        logMessage('Verifying Ethereum app is open...');

        // Check for cached status if we're not bypassing cache
        if (!bypassCache && chrome.storage?.session) {
            try {
                const cachedStatus = await chrome.storage.session.get('ledger_eth_app_status');
                if (cachedStatus.ledger_eth_app_status) {
                    const status = cachedStatus.ledger_eth_app_status;
                    // Only use status if it's very recent (within last 30 seconds)
                    if (Date.now() - status.timestamp < 30000) {
                        logMessage(`Using cached app status: ${status.open ? 'open' : 'closed'}`);
                        sendResponse({
                            success: true,
                            appOpen: status.open,
                            fromCache: true
                        });
                        return;
                    }
                }
            } catch (e) {
                logMessage(`Error checking cached status: ${e.message}`);
                // Continue with direct verification
            }
        }

        // Check if we have an active transport
        if (!window.ledgerTransport && !window.ledgerDevice) {
            // Try to reconnect if we don't have an active device
            try {
                await connectLedger();
            } catch (error) {
                logMessage(`Failed to reconnect to Ledger: ${error.message}`, true);
                sendResponse({
                    success: false,
                    appOpen: false,
                    error: 'No active Ledger connection available'
                });
                return;
            }
        }

        try {
            // Attempt to call an Ethereum-app specific command
            // The Ethereum app implements getAppConfiguration that returns info
            // about the app version when it's open

            // Use WebHID direct commands to check if app is open
            // This simulates a simple APDU command to the Ethereum app

            // Get the device
            let hidDevice = window.ledgerDevice;

            if (!hidDevice) {
                const devices = await navigator.hid.getDevices();
                const ledgerDevices = devices.filter(d => d.vendorId === 0x2c97);

                if (ledgerDevices.length === 0) {
                    sendResponse({
                        success: false,
                        appOpen: false,
                        error: 'No Ledger device found'
                    });
                    return;
                }

                hidDevice = ledgerDevices[0];
                window.ledgerDevice = hidDevice;
            }

            if (!hidDevice.opened) {
                await hidDevice.open();
            }

            // APDU command for Ethereum getAppConfig: CLA=0xe0, INS=0x06, P1=0x00, P2=0x00
            const commandData = new Uint8Array([0xe0, 0x06, 0x00, 0x00]);

            // Prepare the HID report
            const channel = 0x0101; // Default channel
            const tag = 0x05; // APDU tag

            // Command header (channel + tag + sequence + command length)
            const header = new Uint8Array([
                channel >> 8, channel & 0xff, // Channel
                tag, // Tag
                0x00, // Sequence index
                commandData.length, // Command length
            ]);

            // Full command with header + data
            const fullCommand = new Uint8Array(header.length + commandData.length);
            fullCommand.set(header);
            fullCommand.set(commandData, header.length);

            // Create a cleanup function to ensure the listener is removed
            let listenerCleanedUp = false;
            let listener = null;

            const cleanup = () => {
                if (!listenerCleanedUp && hidDevice && listener) {
                    try {
                        hidDevice.removeEventListener('inputreport', listener);
                        listenerCleanedUp = true;
                    } catch (e) {
                        logMessage(`Error cleaning up listener: ${e.message}`, true);
                    }
                }
            };

            // Send the command and listen for response with proper cleanup
            const verificationPromise = new Promise(async (resolve) => {
                try {
                    // Send the command
                    await hidDevice.sendReport(0, fullCommand);

                    // Set up listener for the response
                    listener = (event) => {
                        try {
                            const { data, device } = event;

                            if (device !== hidDevice) return;

                            const dataArray = new Uint8Array(data.buffer);

                            // Process HID report if it has enough data
                            if (dataArray.length > 5) {
                                // Always clean up the listener first
                                cleanup();

                                // Check response status
                                if (dataArray[4] === 0x90 && dataArray[5] === 0x00) {
                                    resolve(true);
                                } else {
                                    resolve(false);
                                }
                            }
                        } catch (listenerError) {
                            logMessage(`Error in inputreport listener: ${listenerError.message}`, true);
                            cleanup();
                            resolve(false);
                        }
                    };

                    hidDevice.addEventListener('inputreport', listener);
                } catch (sendError) {
                    logMessage(`Error sending command: ${sendError.message}`, true);
                    cleanup();
                    resolve(false);
                }
            });

            // Set a timeout that will execute regardless of message channel status
            const timeoutPromise = new Promise(resolve => {
                setTimeout(() => {
                    logMessage('Ethereum app verification timed out');
                    cleanup();
                    resolve(false);
                }, 5000);
            });

            // Race the verification against the timeout
            const result = await Promise.race([verificationPromise, timeoutPromise]);

            // Ensure cleanup happens if the race resolves through the verification promise
            cleanup();

            if (result === true) {
                updateStatus('Ethereum app is open on Ledger device');
                logMessage('Ethereum app is open on Ledger device');

                // Store successful status in session storage
                try {
                    if (chrome.storage?.session) {
                        await chrome.storage.session.set({
                            'ledger_eth_app_status': {
                                open: true,
                                timestamp: Date.now()
                            }
                        });
                    }
                } catch (storageError) {
                    logMessage(`Failed to store app status: ${storageError.message}`, true);
                }

                sendResponse({ success: true, appOpen: true });
            } else {
                updateStatus('Ethereum app is not open on Ledger device');
                logMessage('Ethereum app is not open on Ledger device');

                // Store negative status in session storage
                try {
                    if (chrome.storage?.session) {
                        await chrome.storage.session.set({
                            'ledger_eth_app_status': {
                                open: false,
                                timestamp: Date.now()
                            }
                        });
                    }
                } catch (storageError) {
                    logMessage(`Failed to store app status: ${storageError.message}`, true);
                }

                sendResponse({
                    success: true,
                    appOpen: false,
                    error: 'Ethereum app is not open on the device'
                });
            }
        } catch (error) {
            updateStatus(`Error verifying Ethereum app: ${error.message}`);
            logMessage(`Error verifying Ethereum app: ${error.message}`, true);

            let errorCode = 'UNKNOWN_ERROR';
            if (error.message.includes('timeout')) {
                errorCode = 'APP_VERIFICATION_TIMEOUT';
            } else if (error.message.includes('CLA_NOT_SUPPORTED')) {
                errorCode = 'WRONG_APP_OPEN';
            }

            sendResponse({
                success: false,
                appOpen: false,
                error: error.message,
                errorCode: errorCode
            });
        }
    } catch (error) {
        updateStatus(`Failed to verify Ethereum app: ${error.message}`);
        logMessage(`Failed to verify Ethereum app: ${error.message}`, true);
        sendResponse({
            success: false,
            appOpen: false,
            error: error.message
        });
    }
}

// Initialize the bridge when the offscreen document loads
document.addEventListener('DOMContentLoaded', initHardwareWalletBridge);

// Let the extension know if the window is closing
window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage({ type: 'BRIDGE_CLOSING' });
}); 