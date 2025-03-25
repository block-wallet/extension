// This script handles hardware wallet connections in a visible page
// that can be opened by the user or by the extension

// Initialize status element
const statusElement = document.getElementById('status');

// Update status text with optional color
function updateStatus(message, isError = false) {
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.background = isError ? '#ffebee' : '#e8f4fd';
        statusElement.style.color = isError ? '#c62828' : '#0277bd';
        console.log(message);

        // If we detect a successful connection message, enhance it
        if (message && message.includes('Successfully connected to LEDGER')) {
            console.log('[LEDGER BRIDGE] Successfully connected to Ledger device');
            // Trigger a custom event that our page script can listen for
            try {
                const event = new CustomEvent('ledgerConnected', {
                    detail: {
                        success: true,
                        device: 'LEDGER',
                        timestamp: Date.now()
                    }
                });
                window.dispatchEvent(event);
                console.log('[LEDGER BRIDGE] Dispatched ledgerConnected event');

                // Create a navigation button
                setTimeout(() => {
                    try {
                        // Add navigation button if it doesn't exist yet
                        if (!document.getElementById('continue-button')) {
                            const container = document.querySelector('.container');
                            const navDiv = document.createElement('div');
                            navDiv.style = 'text-align: center; margin-top: 20px;';

                            const btn = document.createElement('button');
                            btn.id = 'continue-button';
                            btn.innerText = 'Continue to Account Selection';
                            btn.style = 'padding: 12px 24px; background: #1E88E5; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px;';
                            btn.onclick = () => {
                                // Navigate to the accounts page directly
                                window.location.href = `${window.location.origin}/tab.html#/hardware-wallet/accounts`;
                            };

                            navDiv.appendChild(btn);
                            container.appendChild(navDiv);

                            // Add a note about automatic navigation
                            const note = document.createElement('p');
                            note.innerText = 'If you are not automatically redirected, click the button above.';
                            note.style = 'text-align: center; color: #666; margin-top: 8px; font-size: 12px;';
                            container.appendChild(note);

                            // Try automatic navigation after 3 seconds
                            setTimeout(() => {
                                console.log('Attempting automatic navigation...');
                                window.location.href = `${window.location.origin}/tab.html#/hardware-wallet/accounts`;
                            }, 3000);
                        }
                    } catch (buttonError) {
                        console.error('Error creating navigation button:', buttonError);
                    }
                }, 500);
            } catch (eventError) {
                console.error('Error dispatching custom event:', eventError);
            }
        }
    }
}

// Parse URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        device: params.get('device') || '',
        action: params.get('action') || 'connect',
        origin: params.get('origin') || '',
    };
}

// Handle hardware wallet connections
async function connectHardwareWallet(deviceType) {
    try {
        updateStatus(`Attempting to connect to ${deviceType}...`);

        // Different connection logic based on device type
        let connected = false;

        switch (deviceType.toUpperCase()) {
            case 'LEDGER':
                connected = await connectLedger();
                break;
            case 'TREZOR':
                connected = await connectTrezor();
                break;
            default:
                throw new Error(`Unsupported device type: ${deviceType}`);
        }

        if (connected) {
            updateStatus(`Successfully connected to ${deviceType}`);
            notifyExtension({ success: true, device: deviceType });
        } else {
            updateStatus(`Failed to connect to ${deviceType}`, true);
            notifyExtension({ success: false, device: deviceType, error: 'Connection failed' });
        }
    } catch (error) {
        console.error('Hardware wallet connection error:', error);
        updateStatus(`Error: ${error.message}`, true);
        notifyExtension({ success: false, device: deviceType, error: error.message });
    }
}

// Connect to Ledger device using WebHID
async function connectLedger() {
    try {
        console.log('[LEDGER BRIDGE] Starting Ledger connection process');
        // Check for WebHID support
        if (!navigator.hid) {
            console.error('[LEDGER BRIDGE] WebHID API not available in browser');
            throw new Error('WebHID API not available in your browser');
        }

        updateStatus('Initializing connection to LEDGER...');

        // First check if we already have permission to any HID devices
        const existingDevices = await navigator.hid.getDevices();
        console.log('[LEDGER BRIDGE] Existing HID devices:', existingDevices);
        const ledgerDevices = existingDevices.filter(d => d.vendorId === 0x2c97);
        console.log('[LEDGER BRIDGE] Existing Ledger devices:', ledgerDevices);

        let device;

        if (ledgerDevices.length > 0) {
            updateStatus('Using previously authorized Ledger device...');
            console.log('[LEDGER BRIDGE] Using previously authorized Ledger device');
            device = ledgerDevices[0];
        } else {
            // Request device access with improved error handling
            try {
                // Add a more explicit user-friendly message
                updateStatus('Please connect your Ledger device and unlock it...');
                console.log('[LEDGER BRIDGE] Requesting user to connect and unlock Ledger device');

                // Wait briefly to ensure the UI updates
                await new Promise(resolve => setTimeout(resolve, 300));

                // Request device with explicit Ledger vendor ID
                console.log('[LEDGER BRIDGE] Requesting WebHID device access');
                const devices = await navigator.hid.requestDevice({
                    filters: [{ vendorId: 0x2c97 }] // Ledger vendor ID
                });

                console.log('[LEDGER BRIDGE] WebHID device request result:', devices);

                if (devices.length === 0) {
                    console.error('[LEDGER BRIDGE] No Ledger device selected by user');
                    throw new Error('No Ledger device selected');
                }

                device = devices[0];
                console.log('[LEDGER BRIDGE] Selected device:', device);
            } catch (e) {
                console.error('[LEDGER BRIDGE] Error during device selection:', e);
                if (e.name === 'SecurityError') {
                    throw new Error('Permission denied. Please allow access to your Ledger device.');
                } else if (e.name === 'NotFoundError') {
                    throw new Error('No Ledger device found. Please ensure your device is connected.');
                } else {
                    throw e;
                }
            }
        }

        // Open connection with retry logic - try up to 3 times
        let connected = false;
        let attempts = 0;
        const maxAttempts = 3;

        while (!connected && attempts < maxAttempts) {
            try {
                attempts++;
                console.log(`[LEDGER BRIDGE] Connection attempt ${attempts}/${maxAttempts}`);
                if (!device.opened) {
                    await device.open();
                    console.log('[LEDGER BRIDGE] Device connection opened successfully');
                }
                connected = true;
            } catch (e) {
                console.error(`[LEDGER BRIDGE] Failed to open device on attempt ${attempts}/${maxAttempts}:`, e);

                if (attempts >= maxAttempts) {
                    throw new Error('Unable to open connection to Ledger after multiple attempts. Please disconnect and reconnect your device.');
                }

                // Wait longer between each retry
                await new Promise(resolve => setTimeout(resolve, 500 * attempts));
            }
        }

        // Verify the device name and inform user
        const deviceName = device.productName || 'Nano X';
        updateStatus(`${deviceName} connected. Please open the Ethereum app on your device.`);
        console.log(`[LEDGER BRIDGE] ${deviceName} connected, waiting for Ethereum app`);

        // Store connection info in session storage for the extension to access
        try {
            const connectionInfo = {
                timestamp: Date.now(),
                success: true,
                vendorId: device.vendorId,
                productId: device.productId,
                productName: device.productName
            };
            sessionStorage.setItem('ledger_connection', JSON.stringify(connectionInfo));
            console.log('[LEDGER BRIDGE] Stored connection info in session storage:', connectionInfo);
        } catch (e) {
            console.warn('[LEDGER BRIDGE] Failed to store connection info in session storage:', e);
        }

        return true;
    } catch (error) {
        console.error('[LEDGER BRIDGE] Ledger connection error:', error);
        updateStatus(`Error connecting to Ledger: ${error.message}`, true);

        // Store the failed connection in session storage
        try {
            const errorInfo = {
                timestamp: Date.now(),
                success: false,
                error: error.message
            };
            sessionStorage.setItem('ledger_connection', JSON.stringify(errorInfo));
            console.log('[LEDGER BRIDGE] Stored error info in session storage:', errorInfo);
        } catch (e) {
            console.warn('[LEDGER BRIDGE] Failed to store error info in session storage:', e);
        }

        return false;
    }
}

// Connect to Trezor device using WebUSB
async function connectTrezor() {
    try {
        // Check for WebUSB support
        if (!navigator.usb) {
            throw new Error('WebUSB API not available in your browser');
        }

        updateStatus('Please connect your Trezor device...');

        // Request device access
        const device = await navigator.usb.requestDevice({
            filters: [
                { vendorId: 0x1209, productId: 0x53c1 }, // Trezor One
                { vendorId: 0x1209, productId: 0x53c0 }, // Trezor Model T
            ]
        });

        if (!device) {
            throw new Error('No Trezor device selected');
        }

        // Open connection
        if (!device.opened) {
            await device.open();
        }

        await device.selectConfiguration(1);
        await device.claimInterface(0);

        updateStatus('Trezor device connected');
        return true;
    } catch (error) {
        console.error('Trezor connection error:', error);
        throw error;
    }
}

// Notify the extension about the connection status
function notifyExtension(data) {
    console.log('[LEDGER BRIDGE] Notifying extension of status:', data);

    // Store the result in localStorage where the extension can access it
    try {
        // Add timestamp to the data
        data.timestamp = Date.now();
        localStorage.setItem('hw_bridge_result', JSON.stringify(data));
    } catch (e) {
        console.error('[LEDGER BRIDGE] Error storing result in localStorage:', e);
    }

    // Try to notify the extension directly via runtime messaging
    try {
        chrome.runtime.sendMessage({
            type: 'HW_BRIDGE_RESULT',
            data
        }).then(response => {
            console.log('[LEDGER BRIDGE] Extension response to notification:', response);
        }).catch(err => {
            console.warn('[LEDGER BRIDGE] Failed to send message to extension:', err);
        });
    } catch (e) {
        console.warn('[LEDGER BRIDGE] Could not send message to extension:', e);
    }
}

// Handle messages from the extension
function setupMessaging() {
    // Listen for messages from the extension
    try {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'HW_BRIDGE_PING') {
                sendResponse({ status: 'ready' });
                return false;
            }
        });
    } catch (e) {
        console.log('Not running in extension context, messaging not set up:', e);
    }
}

// Check if there's a stored connection from previous attempt
function checkPreviousConnection() {
    try {
        console.log('[LEDGER BRIDGE] Checking for previous connection in storage');
        const storedConnection = sessionStorage.getItem('ledger_connection');
        if (storedConnection) {
            const connectionData = JSON.parse(storedConnection);
            console.log('[LEDGER BRIDGE] Found stored connection:', connectionData);

            // If the connection was recent (last 5 minutes) and successful
            if (connectionData.success &&
                connectionData.timestamp &&
                (Date.now() - connectionData.timestamp < 300000)) {

                console.log('[LEDGER BRIDGE] Found valid recent connection, restoring state');
                // Notify the extension
                notifyExtension({
                    success: true,
                    device: 'LEDGER',
                    restored: true,
                    timestamp: Date.now()
                });

                // Update the UI
                updateStatus(`Ledger connection restored. ${connectionData.productName || 'Device'} is connected.`);
                return true;
            }
        }
    } catch (e) {
        console.error('[LEDGER BRIDGE] Error checking previous connection:', e);
    }
    return false;
}

// Add an event listener for the beforeunload event to ensure clean termination
window.addEventListener('beforeunload', function (event) {
    // Notify that the user intentionally closed the window
    try {
        notifyExtension({
            success: false,
            device: getUrlParams().device || 'unknown',
            error: 'user_closed',
            userCancelled: true
        });
    } catch (e) {
        console.error('Failed to notify extension of window close:', e);
    }
});

// Modify the init function to handle close/cancel button properly
function init() {
    console.log('[LEDGER BRIDGE] Initializing hardware wallet bridge');
    const params = getUrlParams();
    console.log('[LEDGER BRIDGE] URL parameters:', params);

    // Setup message listeners
    setupMessaging();

    // Check for previous connections
    const previouslyConnected = checkPreviousConnection();

    // If we have a device specified and no previous connection, connect to it
    if (params.device && !previouslyConnected) {
        console.log(`[LEDGER BRIDGE] Starting connection to ${params.device}`);
        connectHardwareWallet(params.device);
    } else if (!params.device) {
        console.log('[LEDGER BRIDGE] No device specified in URL parameters');
        updateStatus('No hardware wallet device specified. Please specify a device in the URL.', true);
    }
}

// Start the application when the page is loaded
document.addEventListener('DOMContentLoaded', init); 