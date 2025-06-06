// This script runs in the offscreen document and handles hardware wallet connections
// and real-time blockchain monitoring

// --- REMOVE DIRECT IMPORTS ---
// import TransportWebHID from "@ledgerhq/hw-transport-webhid";
// import Eth from "@ledgerhq/hw-app-eth";

// --- ACCESS VIA GLOBAL BUNDLE ---
// Access Ledger libraries from the global bundle
const TransportWebHID = window.LedgerBundle?.TransportWebHID;
const Eth = window.LedgerBundle?.Eth;

// Real-time blockchain monitoring state
let realtimeConnections = new Map(); // chainId -> WebSocket connection
let watchedAddresses = new Set();
let isMonitoringActive = false;

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
let operationInProgress = false; // Flag to track ongoing operations
let lastOperationTime = 0; // Track when the last operation completed

// Real-time blockchain monitoring functions
class RealtimeBlockchainMonitor {
    constructor() {
        this.connections = new Map();
        this.watchedAddresses = new Set();
        this.reconnectAttempts = new Map();
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
    }

            async setupRealtimeConnection(chainId, providerConfig) {
        try {
            logMessage(`Setting up real-time connection for chain ${chainId} using ${providerConfig.provider}`, false);

            // Close existing connection if any
            await this.disconnectChain(chainId);

            const wsUrl = this.getWebSocketUrl(chainId, providerConfig);
            if (!wsUrl) {
                // Gracefully handle unsupported chains
                logMessage(`Real-time monitoring not available for chain ${chainId} with ${providerConfig.provider} - no WebSocket provider configured`, false);
                throw new Error(`No WebSocket provider configured for chain ${chainId} with ${providerConfig.provider}`);
            }

            const ws = new WebSocket(wsUrl);
            const connection = {
                ws,
                chainId,
                isConnected: false,
                subscriptions: new Set(),
                lastHeartbeat: Date.now()
            };

                        ws.onopen = () => {
                logMessage(`WebSocket connected for chain ${chainId} using ${providerConfig.provider}`, false);
                connection.isConnected = true;
                connection.provider = providerConfig.provider;
                this.connections.set(chainId, connection);
                this.resetReconnectAttempts(chainId);

                // Subscribe to new blocks
                this.subscribeToNewBlocks(connection);

                // Subscribe to pending transactions for watched addresses
                this.subscribeToPendingTransactions(connection);

                // Notify background script
                chrome.runtime.sendMessage({
                    type: 'REALTIME_CONNECTION_STATUS',
                    chainId,
                    connected: true,
                    provider: providerConfig.provider,
                    timestamp: Date.now()
                });
            };

            ws.onmessage = (event) => {
                this.handleWebSocketMessage(connection, event.data);
            };

                        ws.onclose = (event) => {
                logMessage(`WebSocket closed for chain ${chainId} (${providerConfig.provider}): ${event.code} ${event.reason}`, true);
                connection.isConnected = false;
                this.connections.delete(chainId);

                // Attempt reconnection if not manually closed
                if (event.code !== 1000) {
                    this.scheduleReconnect(chainId, providerConfig);
                }

                chrome.runtime.sendMessage({
                    type: 'REALTIME_CONNECTION_STATUS',
                    chainId,
                    connected: false,
                    provider: providerConfig.provider,
                    timestamp: Date.now()
                });
            };

            ws.onerror = (error) => {
                logMessage(`WebSocket error for chain ${chainId}: ${error}`, true);
                chrome.runtime.sendMessage({
                    type: 'REALTIME_CONNECTION_ERROR',
                    chainId,
                    error: error.message || 'WebSocket connection error',
                    timestamp: Date.now(),
                    provider: providerConfig.provider
                });
            };

        } catch (error) {
            logMessage(`Failed to setup real-time connection for chain ${chainId}: ${error.message}`, true);
            throw error;
        }
    }

        getWebSocketUrl(chainId, providerConfig) {
        const { apiKey, provider } = providerConfig;

        // Check for local development chains
        const localChains = [31337, 1337, 8545]; // Hardhat, Ganache, local dev chains
        if (localChains.includes(chainId)) {
            logMessage(`Chain ${chainId} is a local development chain - WebSocket monitoring not available`, false);
            return null; // No WebSocket support for local chains
        }

        // Map chain IDs to WebSocket URLs
        const wsUrls = {
            1: { // Ethereum Mainnet
                alchemy: `wss://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
                infura: `wss://mainnet.infura.io/ws/v3/${apiKey}`
            },
            137: { // Polygon
                alchemy: `wss://polygon-mainnet.g.alchemy.com/v2/${apiKey}`
            },
            42161: { // Arbitrum
                alchemy: `wss://arbitrum-mainnet.g.alchemy.com/v2/${apiKey}`
            },
            10: { // Optimism
                alchemy: `wss://opt-mainnet.g.alchemy.com/v2/${apiKey}`
            },
            5: { // Goerli Testnet
                alchemy: `wss://eth-goerli.g.alchemy.com/v2/${apiKey}`
            },
            11155111: { // Sepolia Testnet
                alchemy: `wss://eth-sepolia.g.alchemy.com/v2/${apiKey}`,
                infura: `wss://sepolia.infura.io/ws/v3/${apiKey}`
            },
            80001: { // Mumbai Testnet
                alchemy: `wss://polygon-mumbai.g.alchemy.com/v2/${apiKey}`
            },
            421613: { // Arbitrum Goerli
                alchemy: `wss://arb-goerli.g.alchemy.com/v2/${apiKey}`
            },
            420: { // Optimism Goerli
                alchemy: `wss://opt-goerli.g.alchemy.com/v2/${apiKey}`
            }
        };

        const url = wsUrls[chainId]?.[provider];
        if (!url) {
            logMessage(`No WebSocket provider configured for chain ${chainId} with provider ${provider}`, false);
        }
        return url;
    }

    subscribeToNewBlocks(connection) {
        const subscription = {
            jsonrpc: '2.0',
            method: 'eth_subscribe',
            params: ['newHeads'],
            id: `newHeads_${connection.chainId}_${Date.now()}`
        };

        connection.ws.send(JSON.stringify(subscription));
        connection.subscriptions.add('newHeads');
        logMessage(`Subscribed to new blocks for chain ${connection.chainId}`, false);
    }

    subscribeToPendingTransactions(connection) {
        if (this.watchedAddresses.size === 0) return;

        const addressArray = Array.from(this.watchedAddresses);
        const subscription = {
            jsonrpc: '2.0',
            method: 'eth_subscribe',
            params: ['alchemy_pendingTransactions', {
                toAddress: addressArray,
                fromAddress: addressArray
            }],
            id: `pendingTx_${connection.chainId}_${Date.now()}`
        };

        connection.ws.send(JSON.stringify(subscription));
        connection.subscriptions.add('alchemy_pendingTransactions');
        logMessage(`Subscribed to pending transactions for ${addressArray.length} addresses on chain ${connection.chainId}`, false);
    }

    handleWebSocketMessage(connection, data) {
        try {
            const message = JSON.parse(data);

            // Handle subscription confirmations
            if (message.id && message.result) {
                logMessage(`Subscription confirmed: ${message.id} -> ${message.result}`, false);
                return;
            }

            // Handle subscription data
            if (message.method === 'eth_subscription') {
                const { subscription, result } = message.params;

                if (result.number) {
                    // New block
                    this.handleNewBlock(connection.chainId, result);
                } else if (result.hash && (result.to || result.from)) {
                    // Pending transaction
                    this.handlePendingTransaction(connection.chainId, result);
                }
            }
        } catch (error) {
            logMessage(`Error parsing WebSocket message: ${error.message}`, true);
        }
    }

    handleNewBlock(chainId, blockData) {
        chrome.runtime.sendMessage({
            type: 'REALTIME_NEW_BLOCK',
            chainId,
            blockNumber: parseInt(blockData.number, 16),
            blockHash: blockData.hash,
            timestamp: parseInt(blockData.timestamp, 16),
            receivedAt: Date.now()
        });
    }

    handlePendingTransaction(chainId, txData) {
        chrome.runtime.sendMessage({
            type: 'REALTIME_PENDING_TRANSACTION',
            chainId,
            transaction: {
                hash: txData.hash,
                from: txData.from,
                to: txData.to,
                value: txData.value,
                gasPrice: txData.gasPrice,
                gas: txData.gas,
                input: txData.input
            },
            timestamp: Date.now()
        });
    }

    updateWatchedAddresses(addresses) {
        this.watchedAddresses = new Set(addresses);

        // Resubscribe to pending transactions for all active connections
        for (const connection of this.connections.values()) {
            if (connection.isConnected) {
                this.subscribeToPendingTransactions(connection);
            }
        }
    }

    async disconnectChain(chainId) {
        const connection = this.connections.get(chainId);
        if (connection && connection.ws) {
            connection.ws.close(1000, 'Manual disconnect');
            this.connections.delete(chainId);
        }
    }

    scheduleReconnect(chainId, providerConfig) {
        const attempts = this.reconnectAttempts.get(chainId) || 0;
        if (attempts >= this.maxReconnectAttempts) {
            logMessage(`Max reconnection attempts reached for chain ${chainId}`, true);
            return;
        }

        const delay = this.reconnectDelay * Math.pow(2, attempts); // Exponential backoff
        this.reconnectAttempts.set(chainId, attempts + 1);

        setTimeout(() => {
            logMessage(`Attempting to reconnect to chain ${chainId} (attempt ${attempts + 1})`, false);
            this.setupRealtimeConnection(chainId, providerConfig);
        }, delay);
    }

    resetReconnectAttempts(chainId) {
        this.reconnectAttempts.set(chainId, 0);
    }

    disconnectAll() {
        for (const chainId of this.connections.keys()) {
            this.disconnectChain(chainId);
        }
    }
}

// Global realtime monitor instance
const realtimeMonitor = new RealtimeBlockchainMonitor();

// Initialize bridge
function initHardwareWalletBridge() {
    updateStatus('Hardware wallet bridge and real-time monitor initialized');

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

        // Real-time blockchain monitoring messages
        if (message.type === 'REALTIME_SETUP_CONNECTION') {
            logMessage(`[Offscreen] Received REALTIME_SETUP_CONNECTION for chain ${message.chainId}`, false);
            realtimeMonitor.setupRealtimeConnection(message.chainId, message.providerConfig)
                .then(() => {
                    logMessage(`[Offscreen] Real-time connection setup successful for chain ${message.chainId}`, false);
                    // Always send success response, even for unsupported chains
                    sendResponse({
                        success: true,
                        chainId: message.chainId,
                        timestamp: Date.now()
                    });
                })
                .catch(error => {
                    logMessage(`[Offscreen] Real-time connection setup failed for chain ${message.chainId}: ${error.message}`, false);
                    sendResponse({
                        success: false,
                        error: error.message,
                        chainId: message.chainId,
                        timestamp: Date.now()
                    });
                });
            return true;
        }

        if (message.type === 'REALTIME_UPDATE_WATCHED_ADDRESSES') {
            realtimeMonitor.updateWatchedAddresses(message.addresses);
            sendResponse({
                success: true,
                addressCount: message.addresses.length,
                timestamp: Date.now()
            });
            return false;
        }

        if (message.type === 'REALTIME_DISCONNECT_CHAIN') {
            realtimeMonitor.disconnectChain(message.chainId);
            sendResponse({
                success: true,
                chainId: message.chainId,
                timestamp: Date.now()
            });
            return false;
        }

        if (message.type === 'REALTIME_DISCONNECT_ALL') {
            realtimeMonitor.disconnectAll();
            sendResponse({
                success: true,
                timestamp: Date.now()
            });
            return false;
        }

        if (message.type === 'REALTIME_GET_STATUS') {
            const connectionStatus = {};
            for (const [chainId, connection] of realtimeMonitor.connections) {
                connectionStatus[chainId] = {
                    connected: connection.isConnected,
                    subscriptions: Array.from(connection.subscriptions),
                    lastHeartbeat: connection.lastHeartbeat
                };
            }

            sendResponse({
                success: true,
                connections: connectionStatus,
                watchedAddresses: Array.from(realtimeMonitor.watchedAddresses),
                timestamp: Date.now()
            });
            return false;
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
                operationInProgress = false;
            }
        });
    }
}

// Handle hardware wallet disconnection
async function handleHardwareWalletDisconnection(deviceType, sendResponse) {
    try {
        updateStatus(`Disconnecting ${deviceType} device...`);

        if (deviceType === 'LEDGER') {
            // Wait for any ongoing operations to complete
            if (operationInProgress) {
                updateStatus(`Waiting for ongoing operation to complete before disconnecting...`);
                // Wait up to 5 seconds for the operation to complete
                let attempts = 0;
                while (operationInProgress && attempts < 5) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    attempts++;
                }
            }

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
            operationInProgress = false;

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
                error: `Failed to connect to ${deviceType} device`,
                needsUserGesture: deviceType === 'LEDGER', // Ledger always needs user gesture
                timestamp: Date.now()
            });
        }
    } catch (error) {
        console.error('Connection error:', error);
        updateStatus(`Connection error: ${error.message}`);

        // Determine if this is a permission issue
        const errorCode = determineErrorCode(error, deviceType);
        const needsUserGesture = errorCode === 'PERMISSION_DENIED';

        sendResponse({
            success: false,
            error: error.message,
            errorCode,
            needsUserGesture,
            timestamp: Date.now()
        });
    }
}

// Determine error code from error object
function determineErrorCode(error, deviceType) {
    const message = error.message || '';
    const code = error.code || '';

    if (code === 'PERMISSION_DENIED' || error.name === 'SecurityError') {
        return 'PERMISSION_DENIED';
    }

    if (message.includes('user gesture') || message.includes('permission')) {
        return 'PERMISSION_DENIED';
    }

    if (message.includes('device was disconnected') || message.includes('device disconnected')) {
        return 'DEVICE_DISCONNECTED';
    }

    if (message.includes('Ethereum app') || message.includes('ethereum application')) {
        return 'APP_NOT_OPEN';
    }

    if (message.includes('time') || message.includes('timeout')) {
        return 'TIMEOUT';
    }

    return 'UNKNOWN_ERROR';
}

async function connectLedger() {
    try {
        updateStatus('Connecting to Ledger device via WebHID...');
        console.log('[LEDGER OFFSCREEN] Attempting to connect Ledger device...');

        // This uses the WebHID API which is available in the offscreen context
        if (!navigator.hid) {
            throw new Error('WebHID API not available');
        }

        // Check if there's an active operation
        if (operationInProgress) {
            console.log('[LEDGER OFFSCREEN] Operation in progress, waiting before connecting...');
            // Wait a short time to ensure no operation is in progress (device state)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Close any existing transport to ensure clean state
        if (activeTransport) {
            try {
                console.log('[LEDGER OFFSCREEN] Closing existing transport before reconnecting');
                await activeTransport.close();
                activeTransport = null;
                await new Promise(resolve => setTimeout(resolve, 500)); // Small delay after closing
            } catch (closeError) {
                console.warn('[LEDGER OFFSCREEN] Error closing existing transport:', closeError);
                // Continue anyway - we'll try to create a new transport
                await new Promise(resolve => setTimeout(resolve, 1000)); // Longer delay on error
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
                // Use a timeout to prevent hanging
                const transportPromise = TransportWebHID.create();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('WebHID transport creation timed out')), 10000);
                });

                activeTransport = await Promise.race([transportPromise, timeoutPromise]);
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

        // Set operation in progress
        const wasOperationInProgress = operationInProgress;
        operationInProgress = true;

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
                    error: `Failed to reconnect to Ledger: ${error.message}`,
                    ethAppStatus: {
                        open: false,
                        timestamp: Date.now(),
                        error: error.message,
                        source: 'reconnect_error'
                    }
                });
                operationInProgress = wasOperationInProgress;
                return;
            }
        }

        // If we still don't have a transport, report failure
        if (!activeTransport) {
            safeResponse({
                success: false,
                appOpen: false,
                error: 'Failed to establish Ledger connection',
                ethAppStatus: {
                    open: false,
                    timestamp: Date.now(),
                    error: 'No active transport',
                    source: 'no_transport'
                }
            });
            operationInProgress = wasOperationInProgress;
            return;
        }

        // Create an Ethereum app instance
        const eth = new Eth(activeTransport);

        // Set a timeout for the app verification (increased from 10 to 15 seconds)
        // This helps prevent UI freezes when the device is waiting for user input
        timeoutId = setTimeout(() => {
            console.log('[LEDGER OFFSCREEN] Ethereum app verification timed out');
            safeResponse({
                success: false,
                appOpen: false,
                error: 'Ethereum app verification timed out',
                ethAppStatus: {
                    open: false,
                    timestamp: Date.now(),
                    error: 'Verification timed out',
                    source: 'timeout'
                }
            });
            operationInProgress = wasOperationInProgress;
        }, 15000);

        try {
            // Race condition to handle app check
            const appPromise = eth.getAppConfiguration();

            // Use a race to handle timeout more gracefully
            const raceResult = await Promise.race([
                appPromise,
                new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        reject(new Error('Ethereum app verification timed out'));
                    }, 15000);
                })
            ]);

            // Clear timeout since we got a response
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            console.log('[LEDGER OFFSCREEN] Ethereum app verification result:', raceResult);

            // Successfully got app configuration - Ethereum app is open
            safeResponse({
                success: true,
                appOpen: true,
                appConfig: raceResult,
                // Provide detailed status information for the service worker to store
                ethAppStatus: {
                    open: true,
                    timestamp: Date.now(),
                    device: 'LEDGER',
                    appVersion: raceResult.version || 'unknown',
                    source: 'offscreen_verification_succeeded'
                }
            });
        } catch (raceError) {
            // Clear any existing timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            console.error('[LEDGER OFFSCREEN] Ethereum app verification failed:', raceError);

            // Determine the specific error
            const errorMessage = raceError.message || 'Unknown error';
            let isAppNotOpen = errorMessage.includes('0x6804') ||
                errorMessage.includes('0x6d00') ||
                errorMessage.includes('Ethereum app required') ||
                errorMessage.includes('ethereum application');

            if (isAppNotOpen) {
                console.log('[LEDGER OFFSCREEN] Failure cause: Ethereum app not open');
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
        } finally {
            operationInProgress = wasOperationInProgress;
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
        operationInProgress = false;
    }
}

// Handle Ledger operations
async function handleLedgerOperation(operation, params, sendResponse) {
    let transport = activeTransport;

    // Set flags to prevent concurrent operations
    if (operationInProgress) {
        console.log(`[LEDGER OFFSCREEN] Another operation is in progress, delaying ${operation}...`);

        // Check if operation was very recent (less than 500ms ago)
        const timeSinceLastOperation = Date.now() - lastOperationTime;
        if (timeSinceLastOperation < 500) {
            // Add small delay between operations to give device time to reset
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Wait for in-progress operation to finish (up to 5 seconds)
        let waitTime = 0;
        while (operationInProgress && waitTime < 5000) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitTime += 100;
        }

        // If still in progress after waiting, we'll try to proceed anyway
        if (operationInProgress) {
            console.warn(`[LEDGER OFFSCREEN] Previous operation still in progress after wait, proceeding with ${operation}`);
        }
    }

    operationInProgress = true;

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
        let maxRetries = 2; // Allow up to 2 retries for each operation
        let attempt = 0;
        let lastError = null;

        while (attempt <= maxRetries) {
            try {
                switch (operation) {
                    case 'getPage': { // Use block scope for clarity
                        updateStatus(`Getting page ${params.pageIndex} from Ledger...`);
                        console.log(`[LEDGER OFFSCREEN] Getting page ${params.pageIndex} (attempt ${attempt + 1}/${maxRetries + 1})`);
                        const pageSize = 5; // Standard page size
                        const startIndex = params.pageIndex * pageSize;
                        const hdPath = params.hdPath || "44'/60'/0'/0"; // Default path if needed

                        const accountsResult = [];
                        for (let i = 0; i < pageSize; i++) {
                            const fullPath = `${hdPath}/${startIndex + i}`;
                            console.log(`[LEDGER OFFSCREEN] Getting address for path: ${fullPath}`);
                            // Allow short pause between address fetches to avoid device state issues
                            if (i > 0) await new Promise(resolve => setTimeout(resolve, 100));

                            const accountData = await eth.getAddress(fullPath, false, false);
                            console.log(`[LEDGER OFFSCREEN] Received address: ${accountData.address}`);
                            accountsResult.push(accountData.address);
                        }
                        result = accountsResult;
                        console.log(`[LEDGER OFFSCREEN] Successfully retrieved ${result.length} accounts for page ${params.pageIndex}`);

                        sendResponse({
                            success: true,
                            accounts: result,
                            message: `Retrieved ${result.length} accounts for page ${params.pageIndex}`
                        });
                        return; // Exit the function successfully
                    }
                    case 'getAccounts': { // Use block scope
                        updateStatus(`Getting accounts from Ledger...`);
                        console.log(`[LEDGER OFFSCREEN] Getting accounts (page ${params.pageIndex}, size ${params.pageSize}) (attempt ${attempt + 1}/${maxRetries + 1})`);
                        const pageSize = params.pageSize || 5;
                        const startIndex = params.pageIndex * pageSize;
                        const hdPath = params.hdPath || "44'/60'/0'/0"; // Default path

                        const accountsResult = [];
                        for (let i = 0; i < pageSize; i++) {
                            const fullPath = `${hdPath}/${startIndex + i}`;
                            console.log(`[LEDGER OFFSCREEN] Getting address for path: ${fullPath}`);
                            // Allow short pause between address fetches to avoid device state issues
                            if (i > 0) await new Promise(resolve => setTimeout(resolve, 100));

                            const accountData = await eth.getAddress(fullPath, false, false);
                            console.log(`[LEDGER OFFSCREEN] Received address: ${accountData.address}`);
                            // Format the accounts to match the expected interface
                            accountsResult.push({
                                address: accountData.address,
                                index: startIndex + i,
                                balance: null, // Balance is not typically fetched here
                                name: null // Name is not typically fetched here
                            });
                        }

                        result = accountsResult;
                        console.log(`[LEDGER OFFSCREEN] Successfully retrieved ${result.length} accounts details`);

                        sendResponse({
                            success: true,
                            accounts: result, // Already formatted
                            message: `Retrieved ${result.length} accounts details`
                        });
                        return; // Exit the function successfully
                    }
                    case 'getMultipleAccounts': { // Get accounts for specific indexes
                        updateStatus(`Getting multiple accounts from Ledger...`);
                        console.log(`[LEDGER OFFSCREEN] Getting multiple accounts by index: ${params.indexes.join(', ')} (attempt ${attempt + 1}/${maxRetries + 1})`);

                        const hdPath = params.hdPath || "44'/60'/0'/0"; // Default path
                        const indexesToGet = params.indexes || [];

                        if (indexesToGet.length === 0) {
                            throw new Error('No account indexes provided');
                        }

                        const accountsResult = [];
                        for (let i = 0; i < indexesToGet.length; i++) {
                            const index = indexesToGet[i];
                            const fullPath = `${hdPath}/${index}`;
                            console.log(`[LEDGER OFFSCREEN] Getting address for path: ${fullPath}`);
                            // Allow short pause between address fetches to avoid device state issues
                            if (i > 0) await new Promise(resolve => setTimeout(resolve, 100));

                            const accountData = await eth.getAddress(fullPath, false, false);
                            console.log(`[LEDGER OFFSCREEN] Received address: ${accountData.address}`);
                            accountsResult.push(accountData.address);
                        }

                        console.log(`[LEDGER OFFSCREEN] Successfully retrieved ${accountsResult.length} accounts`);
                        sendResponse({
                            success: true,
                            accounts: accountsResult,
                            message: `Retrieved ${accountsResult.length} accounts`
                        });
                        return; // Exit the function successfully
                    }
                    // Add additional operations (signing, etc.) as needed

                    default:
                        console.error(`[LEDGER OFFSCREEN] Unsupported Ledger operation requested: ${operation}`);
                        throw new Error(`Unsupported Ledger operation: ${operation}`);
                }
            } catch (error) {
                lastError = error;
                console.error(`[LEDGER OFFSCREEN] Error in ${operation} (attempt ${attempt + 1}/${maxRetries + 1}):`, error);

                // Check if this is a device state error we should retry
                const shouldRetry = error.message && (
                    error.message.includes('busy') ||
                    error.message.includes('state') ||
                    error.message.includes('Lock') ||
                    error.message.includes('already open') ||
                    error.message.includes('in progress')
                );

                if (shouldRetry && attempt < maxRetries) {
                    attempt++;
                    console.log(`[LEDGER OFFSCREEN] Retrying operation after error (${error.message})...`);

                    // Add increasing delays between retries (500ms, 1000ms)
                    const delay = 500 * attempt;
                    await new Promise(resolve => setTimeout(resolve, delay));

                    // On first retry, try to reset the connection
                    if (attempt === 1 && activeTransport) {
                        try {
                            console.log('[LEDGER OFFSCREEN] Resetting transport before retry...');
                            await activeTransport.close();
                            activeTransport = null;
                            // Small delay after closing
                            await new Promise(resolve => setTimeout(resolve, 500));
                            // Create new transport
                            transport = await TransportWebHID.create();
                            activeTransport = transport;
                            eth = new Eth(transport);
                            console.log('[LEDGER OFFSCREEN] Transport reset completed for retry.');
                        } catch (resetError) {
                            console.warn('[LEDGER OFFSCREEN] Error resetting transport:', resetError);
                        }
                    }
                } else {
                    // Either we've exhausted retries or it's not a retryable error
                    throw error;
                }
            }
        }

        // If we reach here without returning, we've exhausted retries
        throw new Error(`Failed to complete operation after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
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
    } finally {
        // Always mark operation as complete and record time
        operationInProgress = false;
        lastOperationTime = Date.now();
    }
}

// Initialize the bridge when the offscreen document loads
document.addEventListener('DOMContentLoaded', initHardwareWalletBridge);

// Let the extension know if the window is closing
window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage({ type: 'BRIDGE_CLOSING' });
});
