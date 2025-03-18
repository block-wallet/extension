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
        // Check for WebHID support
        if (!navigator.hid) {
            throw new Error('WebHID API not available in your browser');
        }

        updateStatus('Initializing connection to LEDGER...');

        // First check if we already have permission to any HID devices
        const existingDevices = await navigator.hid.getDevices();
        const ledgerDevices = existingDevices.filter(d => d.vendorId === 0x2c97);

        let device;

        if (ledgerDevices.length > 0) {
            updateStatus('Using previously authorized Ledger device...');
            device = ledgerDevices[0];
        } else {
            // Request device access with improved error handling
            try {
                // Add a more explicit user-friendly message
                updateStatus('Please connect your Ledger device and unlock it...');

                // Wait briefly to ensure the UI updates
                await new Promise(resolve => setTimeout(resolve, 300));

                // Request device with explicit Ledger vendor ID
                const devices = await navigator.hid.requestDevice({
                    filters: [{ vendorId: 0x2c97 }] // Ledger vendor ID
                });

                if (devices.length === 0) {
                    throw new Error('No Ledger device selected');
                }

                device = devices[0];
            } catch (e) {
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
                if (!device.opened) {
                    await device.open();
                }
                connected = true;
            } catch (e) {
                console.error(`Failed to open device on attempt ${attempts}/${maxAttempts}:`, e);

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

        // Store connection info in session storage for the extension to access
        try {
            sessionStorage.setItem('ledger_connection', JSON.stringify({
                timestamp: Date.now(),
                success: true,
                vendorId: device.vendorId,
                productId: device.productId,
                productName: device.productName
            }));
        } catch (e) {
            console.warn('Failed to store connection info in session storage:', e);
        }

        return true;
    } catch (error) {
        console.error('Ledger connection error:', error);
        updateStatus(`Error connecting to Ledger: ${error.message}`, true);

        // Store the failed connection in session storage
        try {
            sessionStorage.setItem('ledger_connection', JSON.stringify({
                timestamp: Date.now(),
                success: false,
                error: error.message
            }));
        } catch (e) {
            console.warn('Failed to store error info in session storage:', e);
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
    // First, try to use chrome.runtime messaging (if opened by extension)
    try {
        chrome.runtime.sendMessage({
            type: 'HW_CONNECTION_STATUS',
            ...data
        });
    } catch (e) {
        console.log('Failed to send message to extension directly. Using localStorage fallback.');

        // Fallback: use localStorage to pass data back to extension
        try {
            localStorage.setItem('hw_bridge_result', JSON.stringify({
                timestamp: Date.now(),
                ...data
            }));
        } catch (storageError) {
            console.error('Failed to store result in localStorage:', storageError);
        }

        // If origin is specified in URL, try to send a message to parent window
        const params = getUrlParams();
        if (params.origin) {
            try {
                window.opener.postMessage({
                    type: 'HARDWARE_WALLET_BRIDGE',
                    ...data
                }, params.origin);
            } catch (e) {
                console.error('Failed to send message to parent window', e);
            }
        }
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
        const storedConnection = sessionStorage.getItem('ledger_connection');
        if (storedConnection) {
            const connectionData = JSON.parse(storedConnection);
            // Only consider recent connections (within last 5 minutes)
            if (connectionData && connectionData.success &&
                (Date.now() - connectionData.timestamp < 300000)) {
                updateStatus(`Using previously connected device: ${connectionData.productName || 'Ledger'}`);
                return true;
            }
        }
    } catch (e) {
        console.warn('Failed to check previous connection:', e);
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
    const params = getUrlParams();

    // Add event listeners to any cancel buttons
    const cancelButtons = document.querySelectorAll('.cancel-button, .close-button');
    cancelButtons.forEach(button => {
        button.addEventListener('click', () => {
            notifyExtension({
                success: false,
                device: params.device || 'unknown',
                error: 'user_cancelled',
                userCancelled: true
            });
            window.close();
        });
    });

    if (params.device) {
        updateStatus(`Initializing connection to ${params.device}...`);

        // Check for previous connection first (useful for MV3 reconnection)
        if (params.device.toUpperCase() === 'LEDGER' && checkPreviousConnection()) {
            // If we have a recent connection, just notify success
            notifyExtension({ success: true, device: params.device });
        } else {
            // Give the page a moment to render before starting connection
            setTimeout(() => {
                connectHardwareWallet(params.device);
            }, 500);
        }
    } else {
        updateStatus('No device specified. Please specify a device type in the URL.', true);
    }

    try {
        setupMessaging();
    } catch (e) {
        console.log('Not running in extension context, messaging not set up.');
    }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', init); 