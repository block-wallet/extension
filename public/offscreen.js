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

// Initialize bridge
function initHardwareWalletBridge() {
    updateStatus('Hardware wallet bridge initialized');

    // Listen for messages from the extension
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'HW_CONNECT_REQUEST') {
            handleHardwareWalletConnection(message.device, sendResponse);
            return true; // Keep the message channel open for async response
        }

        if (message.type === 'HW_STATUS') {
            sendResponse({ status: 'ready' });
            return false;
        }
    });

    // Let the extension know the bridge is ready
    chrome.runtime.sendMessage({ type: 'BRIDGE_READY' });
}

// Handle hardware wallet connection
async function handleHardwareWalletConnection(deviceType, sendResponse) {
    try {
        updateStatus(`Connecting to ${deviceType} device...`);

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
            sendResponse({ success: true });
        } else {
            updateStatus(`Failed to connect to ${deviceType} device`);
            sendResponse({ success: false, error: 'Connection failed' });
        }
    } catch (error) {
        updateStatus(`Error connecting to hardware wallet: ${error.message}`);
        sendResponse({ success: false, error: error.message });
    }
}

// Connect to Ledger device using WebHID
async function connectLedger() {
    try {
        // This uses the WebHID API which is available in the offscreen context
        if (!navigator.hid) {
            throw new Error('WebHID API not available');
        }

        // Request device access
        const devices = await navigator.hid.requestDevice({
            filters: [
                // Ledger device filters
                { vendorId: 0x2c97 } // Ledger vendor ID
            ]
        });

        // No devices selected
        if (devices.length === 0) {
            return false;
        }

        // Try to open the device
        const device = devices[0];
        if (!device.opened) {
            await device.open();
        }

        // Store the device connection for later use
        window.ledgerDevice = device;
        return true;
    } catch (error) {
        console.error('Ledger connection error:', error);
        return false;
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

// Initialize the bridge when the offscreen document loads
document.addEventListener('DOMContentLoaded', initHardwareWalletBridge);

// Let the extension know if the window is closing
window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage({ type: 'BRIDGE_CLOSING' });
}); 