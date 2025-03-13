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

        updateStatus('Please connect your Ledger device and unlock it...');

        // Request device access
        const devices = await navigator.hid.requestDevice({
            filters: [{ vendorId: 0x2c97 }] // Ledger vendor ID
        });

        if (devices.length === 0) {
            throw new Error('No Ledger device selected');
        }

        const device = devices[0];

        // Open connection
        if (!device.opened) {
            await device.open();
        }

        updateStatus('Ledger device connected. Please open the Ethereum app on your device.');
        return true;
    } catch (error) {
        console.error('Ledger connection error:', error);
        throw error;
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
        localStorage.setItem('hw_bridge_result', JSON.stringify({
            timestamp: Date.now(),
            ...data
        }));

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
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'HW_BRIDGE_PING') {
            sendResponse({ status: 'ready' });
            return false;
        }
    });
}

// Initialize the page
function init() {
    const params = getUrlParams();

    if (params.device) {
        updateStatus(`Initializing connection to ${params.device}...`);

        // Give the page a moment to render before starting connection
        setTimeout(() => {
            connectHardwareWallet(params.device);
        }, 500);
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