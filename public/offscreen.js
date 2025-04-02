// This script runs in the offscreen document and handles hardware wallet connections

// --- REMOVE DIRECT IMPORTS --- 
// import TransportWebHID from "@ledgerhq/hw-transport-webhid";
// import Eth from "@ledgerhq/hw-app-eth";

// --- ACCESS VIA GLOBAL BUNDLE --- 
// Access Ledger libraries from the global bundle
const TransportWebHID = window.LedgerBundle?.TransportWebHID;
const Eth = window.LedgerBundle?.Eth;

// Add checks to ensure they loaded
if (!TransportWebHID || !Eth) {
    console.error("Offscreen script failed to load Ledger libraries from bundle.");
    // Notify background script of failure
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_INIT_ERROR', error: 'Ledger libs not found' });
    // Log error for debugging
    logMessage("Failed to load Ledger libraries. Check ledger-bundle.js is properly included.", true);
}

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
let activeTransport = null; // Changed from activeTransports.LEDGER
let ledgerDevice = null; // Store the device reference separately

// Initialize bridge
function initHardwareWalletBridge() {
    updateStatus('Hardware wallet bridge initialized');

    // Close any existing transport on page load to ensure clean state
    async function closeExistingTransports() {
        if (activeTransport) {
            try {
                console.log('[LEDGER OFFSCREEN] Closing existing transport on page load');
                await activeTransport.close();
                activeTransport = null;
            } catch (error) {
                console.warn('[LEDGER OFFSCREEN] Error closing existing transport:', error);
            }
        }
    }

    // Call immediately to ensure clean state
    closeExistingTransports();

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
            const hasActiveDevice = message.device && activeTransport !== null;
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

        if (message.type === 'HW_LEDGER_OPERATION') {
            handleLedgerOperation(message.operation, message.params, sendResponse)
                .catch(error => {
                    console.error("[LEDGER OFFSCREEN] Unhandled error in handleLedgerOperation:", error);
                    // Ensure a response is sent even on unexpected errors
                    sendResponse({
                        success: false,
                        error: error.message || 'Unknown error during operation',
                        operation: message.operation,
                        params: message.params
                    });
                });
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
                activeTransport = null;
                ledgerDevice = null;
            }
        });
    }
}

// Handle hardware wallet disconnection
async function handleHardwareWalletDisconnection(deviceType, sendResponse) {
    try {
        updateStatus(`Disconnecting ${deviceType} device...`);

        if (deviceType === 'LEDGER') {
            // Close the transport if it exists
            if (activeTransport) {
                try {
                    console.log('[LEDGER OFFSCREEN] Closing transport during disconnection');
                    await activeTransport.close();
                } catch (closeError) {
                    console.warn('[LEDGER OFFSCREEN] Error closing transport:', closeError);
                    // Continue anyway - we want to clean up as much as possible
                }
                activeTransport = null;
            }

            // Clean up device reference too
            ledgerDevice = null;

            // Force garbage collection of any remaining references (if possible)
            if (global.gc) {
                try {
                    global.gc();
                } catch (e) {
                    // Ignore if not available
                }
            }
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
                deviceInfo: ledgerDevice ? {
                    productName: ledgerDevice.productName,
                    vendorId: ledgerDevice.vendorId,
                    productId: ledgerDevice.productId
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
        updateStatus('Connecting to Ledger device via WebHID...');
        console.log('[LEDGER OFFSCREEN] Attempting to connect Ledger device...');

        // This uses the WebHID API which is available in the offscreen context
        if (!navigator.hid) {
            throw new Error('WebHID API not available');
        }

        // Close any existing transport to ensure clean state
        if (activeTransport) {
            try {
                console.log('[LEDGER OFFSCREEN] Closing existing transport before reconnecting');
                await activeTransport.close();
                activeTransport = null;
            } catch (closeError) {
                console.warn('[LEDGER OFFSCREEN] Error closing existing transport:', closeError);
                // Continue anyway - we'll try to create a new transport
            }
        }

        // ** PRIORITY: Use getDevices() first, assuming UI granted permission **
        let device;
        try {
            console.log('[LEDGER OFFSCREEN] Checking for permitted devices via getDevices()...');
            const permittedDevices = await navigator.hid.getDevices();
            const ledgerDevices = permittedDevices.filter(d => d.vendorId === 0x2c97);
            console.log(`[LEDGER OFFSCREEN] Found ${ledgerDevices.length} permitted Ledger devices`);

            if (ledgerDevices.length > 0) {
                // Use the first permitted device found
                device = ledgerDevices[0];
                console.log('[LEDGER OFFSCREEN] Using previously permitted Ledger device:', device);
            } else {
                console.log('[LEDGER OFFSCREEN] No permitted Ledger device found via getDevices().');
                // Fallback to requestDevice IF necessary (e.g., called from background restore)
                // This should ideally NOT be hit in the primary UI-driven flow anymore.
                // If this *is* hit from background, it WILL fail without a gesture.
                console.log('[LEDGER OFFSCREEN] Falling back to requestDevice() - this will likely fail if not in user gesture context...');
                try {
                    const devices = await navigator.hid.requestDevice({
                        filters: [
                            { vendorId: 0x2c97 },
                        ]
                    });

                    if (devices.length === 0) {
                        throw new Error('No Ledger device selected during fallback requestDevice()');
                    }
                    device = devices[0];
                    console.log('[LEDGER OFFSCREEN] Selected new Ledger device via fallback requestDevice():', device);
                } catch (requestError) {
                    console.error('[LEDGER OFFSCREEN] Fallback requestDevice() failed:', requestError);
                    if (requestError instanceof DOMException && requestError.name === 'SecurityError') {
                        const error = new Error('Must be handling a user gesture to show a permission request (fallback)');
                        error.code = 'PERMISSION_DENIED';
                        error.requiresUserGesture = true;
                        throw error;
                    }
                    throw requestError; // Re-throw other request errors
                }
            }
        } catch (getDevicesError) {
            console.error('[LEDGER OFFSCREEN] Error during getDevices():', getDevicesError);
            // Potentially handle specific getDevices errors if needed
            throw getDevicesError;
        }

        // Store the device connection globally in the offscreen context for other operations
        ledgerDevice = device;

        // Don't manually open the device - let TransportWebHID.create handle that
        // TransportWebHID.create will detect and use any permitted HID devices

        if (!activeTransport) {
            try {
                console.log('[LEDGER OFFSCREEN] Creating WebHID transport...');
                activeTransport = await TransportWebHID.create();
                console.log('[LEDGER OFFSCREEN] WebHID transport created.');
            } catch (transportError) {
                console.error('[LEDGER OFFSCREEN] Failed to create WebHID transport:', transportError);
                throw transportError; // Propagate error
            }
        }

        console.log('[LEDGER OFFSCREEN] Successfully connected to Ledger device via WebHID');
        updateStatus('Successfully connected to Ledger device via WebHID');

        return true;
    } catch (error) {
        console.error('[LEDGER OFFSCREEN] Ledger connection error in connectLedger():', error);
        updateStatus(`Ledger connection failed: ${error.message}`);
        throw error; // Let the handleHardwareWalletConnection catch and format it
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
            // Transport is persistent, listeners are temporary for this check
            if (inputListener && activeTransport) { // Check activeTransport
                // Transport doesn't directly expose removeEventListener in the same way HIDDevice did
                // The listener is implicitly handled by the transport's exchange method
                console.log('[LEDGER OFFSCREEN] Listener cleanup (handled by transport.exchange)');
                // window.ledgerDevice.removeEventListener('inputreport', inputListener);
                // console.log('[LEDGER OFFSCREEN] Removed input listener');
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
        if (!activeTransport) { // Check activeTransport
            // Try to reconnect if we don't have an active device/transport
            try {
                await connectLedger(); // This should set activeTransport
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
                // Ensure transport is available
                if (!activeTransport) {
                    reject(new Error('Ledger transport not available'));
                    return;
                }

                // Use the Eth app class with the transport
                const eth = new Eth(activeTransport);
                console.log('[LEDGER OFFSCREEN] Eth app instance created, calling getAppConfiguration');

                // The getAppConfiguration method directly verifies the app
                const appConfig = await eth.getAppConfiguration();
                console.log('[LEDGER OFFSCREEN] getAppConfiguration successful:', appConfig);

                // If getAppConfiguration succeeds, the app is open
                resolve(true);

            } catch (error) {
                console.error('[LEDGER OFFSCREEN] Verification error via getAppConfiguration:', error);
                // Map specific Ledger errors if needed
                if (error && error.statusCode) {
                    const knownErrors = {
                        0x6985: 'Conditions not satisfied (Ethereum app not open?)',
                        0x6d00: 'INS not supported (wrong app open?)',
                        0x6e00: 'CLA not supported (wrong app open?)'
                        // Add other relevant status codes
                    };
                    const errorDesc = knownErrors[error.statusCode] || `Unknown Ledger error ${error.statusCode.toString(16)}`;
                    reject(new Error(`Verification failed: ${errorDesc}`));
                } else {
                    reject(error); // Re-throw other errors
                }
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
                if (ledgerDevice) {
                    const device = ledgerDevice;
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

// Handle Ledger operations
async function handleLedgerOperation(operation, params, sendResponse) {
    let transport = activeTransport;
    try {
        updateStatus(`Executing Ledger operation: ${operation}`);
        console.log(`[LEDGER OFFSCREEN] Executing operation: ${operation}`, params);

        // Ensure transport is available, try creating if not
        if (!transport) {
            updateStatus('No Ledger transport - attempting to create...');
            console.log('[LEDGER OFFSCREEN] No transport, attempting to create...');
            try {
                transport = await TransportWebHID.create();
                activeTransport = transport; // Store globally
                console.log('[LEDGER OFFSCREEN] Transport created successfully.');
            } catch (transportError) {
                console.error('[LEDGER OFFSCREEN] Failed to create transport for operation:', transportError);
                throw new Error('Failed to establish Ledger transport');
            }
        }

        // Create Eth app instance using the transport
        const eth = new Eth(transport);
        console.log('[LEDGER OFFSCREEN] Eth app instance created for operation');

        // Execute the requested operation using eth instance
        let result;
        switch (operation) {
            case 'getPage': { // Use block scope for clarity
                updateStatus(`Getting page ${params.pageIndex} from Ledger...`);
                console.log(`[LEDGER OFFSCREEN] Getting page ${params.pageIndex}`);
                const pageSize = 5; // Standard page size
                const startIndex = params.pageIndex * pageSize;
                const hdPath = params.hdPath || "44'/60'/0'/0"; // Default path if needed

                const accountsResult = [];
                for (let i = 0; i < pageSize; i++) {
                    const fullPath = `${hdPath}/${startIndex + i}`;
                    try {
                        console.log(`[LEDGER OFFSCREEN] Getting address for path: ${fullPath}`);
                        const accountData = await eth.getAddress(fullPath, false, false); // address, display=false, chainCode=false
                        console.log(`[LEDGER OFFSCREEN] Received address: ${accountData.address}`);
                        accountsResult.push(accountData.address);
                    } catch (addrError) {
                        console.error(`[LEDGER OFFSCREEN] Error getting address for path ${fullPath}:`, addrError);
                        // Decide how to handle errors - stop, continue, return partial?
                        // For now, let's throw to indicate failure on this page
                        throw new Error(`Failed to get address for path ${fullPath}: ${addrError.message}`);
                    }
                }
                result = accountsResult;
                console.log(`[LEDGER OFFSCREEN] Successfully retrieved ${result.length} accounts for page ${params.pageIndex}`);
                sendResponse({
                    success: true,
                    accounts: result,
                    message: `Retrieved ${result.length} accounts for page ${params.pageIndex}`
                });
                break;
            }
            case 'getAccounts': { // Use block scope
                updateStatus(`Getting accounts from Ledger...`);
                console.log(`[LEDGER OFFSCREEN] Getting accounts (page ${params.pageIndex}, size ${params.pageSize})`);
                const pageSize = params.pageSize || 5;
                const startIndex = params.pageIndex * pageSize;
                const hdPath = params.hdPath || "44'/60'/0'/0"; // Default path

                const accountsResult = [];
                for (let i = 0; i < pageSize; i++) {
                    const fullPath = `${hdPath}/${startIndex + i}`;
                    try {
                        console.log(`[LEDGER OFFSCREEN] Getting address for path: ${fullPath}`);
                        const accountData = await eth.getAddress(fullPath, false, false);
                        console.log(`[LEDGER OFFSCREEN] Received address: ${accountData.address}`);
                        // Format the accounts to match the expected interface
                        accountsResult.push({
                            address: accountData.address,
                            index: startIndex + i,
                            balance: null, // Balance is not typically fetched here
                            name: null // Name is not typically fetched here
                        });
                    } catch (addrError) {
                        console.error(`[LEDGER OFFSCREEN] Error getting address for path ${fullPath}:`, addrError);
                        throw new Error(`Failed to get address for path ${fullPath}: ${addrError.message}`);
                    }
                }
                result = accountsResult;
                console.log(`[LEDGER OFFSCREEN] Successfully retrieved ${result.length} accounts details`);

                sendResponse({
                    success: true,
                    accounts: result, // Already formatted
                    message: `Retrieved ${result.length} accounts details`
                });
                break;
            }
            // Add additional operations (signing, etc.) as needed
            // case 'signTransaction': { ... }
            // case 'signPersonalMessage': { ... }

            default:
                console.error(`[LEDGER OFFSCREEN] Unsupported Ledger operation requested: ${operation}`);
                throw new Error(`Unsupported Ledger operation: ${operation}`);
        }
    } catch (error) {
        console.error(`[LEDGER OFFSCREEN] Error executing ${operation}:`, error);
        updateStatus(`Error: ${error.message}`);

        // Try to close transport on error to potentially reset state
        if (activeTransport) {
            try { await activeTransport.close(); } catch { /* ignore */ }
            activeTransport = null;
        }

        sendResponse({
            success: false,
            error: error.message,
            operation: operation,
            params: params,
            stack: error.stack // Include stack for better debugging
        });
    }
}

// Initialize the bridge when the offscreen document loads
document.addEventListener('DOMContentLoaded', initHardwareWalletBridge);

// Let the extension know if the window is closing
window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage({ type: 'BRIDGE_CLOSING' });
}); 