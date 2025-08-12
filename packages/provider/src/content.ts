import {
    EXTERNAL,
    CONTENT,
    Origin,
    WindowTransportRequestMessage,
} from '@block-wallet/background/utils/types/communication';
import { Mutex } from 'async-mutex';
import { SignalMessage, Signals } from './types';
import { checkScriptLoad } from './utils/site';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import blankProvider from '../../../dist/blankProvider.js?raw';
import { isManifestV3 } from '@block-wallet/background/utils/manifest';

// Extend Window interface to include ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}

const EXTENSION_CONTEXT_INVALIDATED_CHROMIUM_ERROR =
    'Extension context invalidated.';

let providerOverridden = false;
let fallbackInjected = false;

// Track provider injection errors for debugging
const providerInjectionErrors: Array<{
    timestamp: number;
    error: string;
    context?: string;
}> = [];

// Detect browser API support for WebHID and WebUSB
const browserAPISupport = {
    webHID: 'hid' in navigator,
    webUSB: 'usb' in navigator,
};

/**
 * Injects the provider script into the page with error handling
 */
function injectProvider() {
    try {
        if (!isManifestV3()) {
            // Manifest v2 injection - inject script directly
            const injectableScript = blankProvider;
            const injectableScriptSourceMapURL = `//# sourceURL=${chrome.runtime.getURL(
                'blankProvider.js'
            )}\n`;
            const BUNDLE = injectableScript + injectableScriptSourceMapURL;

            const container = document.head || document.documentElement;
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.textContent = BUNDLE;
            script.setAttribute('async', 'false');
            container.insertBefore(script, container.children[0]);
            container.removeChild(script);
        } else {
            const checkProvider = () => {
                return window.ethereum && (window.ethereum as any).isBlockWallet;
            };

            const fallbackInjectMainWorldProvider = () => {
                if (fallbackInjected || window !== window.top) return;
                try {
                    const container = document.head || document.documentElement;
                    const script = document.createElement('script');
                    script.type = 'text/javascript';
                    script.async = false;
                    script.src = chrome.runtime.getURL('blankProvider.js');
                    container.insertBefore(script, container.children[0]);
                    fallbackInjected = true;
                    console.warn('BlockWallet: Fallback injected blankProvider.js into MAIN world');
                } catch (e) {
                    console.error('BlockWallet: Fallback injection failed', e);
                }
            };

            if (!checkProvider()) {
                let attempts = 0;
                const maxAttempts = 100;
                const checkInterval = setInterval(() => {
                    attempts++;
                    if (checkProvider()) {
                        clearInterval(checkInterval);
                        return;
                    }
                    if (attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        fallbackInjectMainWorldProvider();
                    }
                }, 100);
            }
        }
    } catch (error) {
        // Log provider injection errors for troubleshooting
        const errorInfo = {
            timestamp: Date.now(),
            error: error.message || String(error),
            context: 'injectProvider',
        };
        providerInjectionErrors.push(errorInfo);
        console.error('BlockWallet: Provider injection failed:', errorInfo);

        // Notify the extension background about the failure
        try {
            chrome.runtime.sendMessage({
                message: CONTENT.PROVIDER_INJECTION_FAILURE,
                error: errorInfo,
            });
        } catch (e) {
            // Silent catch - background may not be available
        }
    }
}

window.addEventListener('ethereum#initialized', (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail !== 'isBlockWallet') {
        providerOverridden = true;
    } else {
        providerOverridden = false;
    }
});

// Inject provider with error tracking
injectProvider();

// Keep-alive implementation with improved interval and error handling
const SW_KEEP_ALIVE_INTERVAL = 30000; // 30 seconds default to reduce resource usage
let SW_ALIVE = false;
let portReinitialized = false;
let timeoutRef: NodeJS.Timeout;

// Track consecutive failures for dynamic retry adjustment
let consecutiveKeepAliveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Sends a keep-alive message to the service worker with enhanced error handling
 * and status tracking
 */
function swKeepAlive() {
    return new Promise<void>((resolve) => {
        try {
            chrome.runtime.sendMessage(
                {
                    message: CONTENT.SW_KEEP_ALIVE,
                    browserSupport: browserAPISupport
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                        const errorMessage = chrome.runtime.lastError.message || '';
                        // Log only meaningful errors
                        if (!errorMessage.includes('Receiving end does not exist')) {
                            console.log(
                                'Error keeping alive:',
                                errorMessage || chrome.runtime.lastError
                            );
                        }
                        const err = errorMessage || '';
                        SW_ALIVE = !err.includes('Receiving end does not exist');
                        portReinitialized = SW_ALIVE;

                        // Track consecutive failures for adaptive retry
                        consecutiveKeepAliveFailures++;
                    } else {
                        SW_ALIVE = true;
                        // Reset consecutive failures counter on success
                        consecutiveKeepAliveFailures = 0;

                        // If we received specific response data about the service worker
                        if (response && response.status) {
                            // Process any notifications or instructions from background
                            processServiceWorkerResponse(response);
                        }
                    }
                    resolve();
                }
            );
        } catch (e) {
            let message = `BlockWallet: ${e}`;
            if (e.message === EXTENSION_CONTEXT_INVALIDATED_CHROMIUM_ERROR) {
                message = `BlockWallet: Please refresh the page. ${e}`;
                // Notify page about extension context invalidation
                notifyPage({
                    signal: Signals.EXTENSION_CONTEXT_INVALIDATED,
                    message: 'Extension context invalidated. Please refresh the page.'
                });
            }
            console.warn('swKeepAlive error', message); // Use warn instead of log
            consecutiveKeepAliveFailures++;
            resolve();
        }
    });
}

/**
 * Process service worker response data for notification handling
 */
function processServiceWorkerResponse(response: any) {
    if (response.notification) {
        // Forward notification to page
        notifyPage({
            signal: Signals.NOTIFICATION,
            message: response.notification.message,
            type: response.notification.type,
            data: response.notification.data
        });
    }
}

/**
 * Send notification to the page
 */
function notifyPage(notification: Partial<SignalMessage>) {
    try {
        window.postMessage(
            {
                ...notification,
                origin: Origin.BACKGROUND,
            } as SignalMessage,
            window.location.href
        );
    } catch (error) {
        console.warn('Failed to send notification to page:', error);
    }
}

/**
 * Maintains the extension service worker alive with dynamic retry strategy
 * based on consecutive failures
 */
async function keepExtensionAlive() {
    // Only top-level frame should run keep-alive to avoid duplicate pings
    if (window !== window.top) {
        return;
    }

    // If page is hidden, back off to reduce CPU/IO
    const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    await swKeepAlive();

    if (timeoutRef) {
        clearTimeout(timeoutRef);
    }

    let nextInterval = SW_KEEP_ALIVE_INTERVAL;

    if (consecutiveKeepAliveFailures > 0) {
        const backoffFactor = Math.min(Math.pow(1.5, consecutiveKeepAliveFailures), 3);
        nextInterval = SW_KEEP_ALIVE_INTERVAL * backoffFactor;
    }

    if (isHidden) {
        nextInterval = Math.max(nextInterval, 60000);
    }

    if (consecutiveKeepAliveFailures >= MAX_CONSECUTIVE_FAILURES) {
        notifyPage({
            signal: Signals.SW_CONSECUTIVE_FAILURES,
            message: 'Connection to extension is unstable. You may need to refresh the page.'
        });
    }

    timeoutRef = setTimeout(keepExtensionAlive, nextInterval);
}

// Only use keep-alive in Manifest V3, and ensure cleanup on page unload
if (isManifestV3()) {
    // Only start keep-alive in the top-level frame
    if (window === window.top) {
        keepExtensionAlive();
    }

    // Cleanup on page unload to prevent memory leaks
    window.addEventListener('beforeunload', () => {
        if (timeoutRef) {
            clearTimeout(timeoutRef);
        }
    });
} else {
    SW_ALIVE = true;
}

function sleep(ms: number): Promise<unknown> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

let port: chrome.runtime.Port | undefined = undefined;
const initMutex: Mutex = new Mutex();

// Check background settings for script load with improved error handling
chrome.runtime.sendMessage(
    {
        message: CONTENT.SHOULD_INJECT,
        browserSupport: browserAPISupport
    },
    (response: { shouldInject: boolean }): void => {
        const error = chrome.runtime.lastError;
        const shouldLoad = checkScriptLoad();
        if (
            port &&
            (response?.shouldInject !== true || shouldLoad !== true || error) &&
            //If provider has been overridden by another wallet, then remove connection.
            providerOverridden
        ) {
            if (isManifestV3() && timeoutRef) {
                clearTimeout(timeoutRef);
            }
            port.disconnect();
            window.removeEventListener('message', windowListener);
            console.log(
                'BlockWallet: Provider not injected due to user setting.'
            );
        } else if (providerOverridden) {
            injectProvider();
        }
    }
);

// Setup window listener with enhanced message validation and error handling

const windowListener = async ({
    data,
    source,
}: MessageEvent<WindowTransportRequestMessage>): Promise<void> => {
    // Only allow messages from our window, by the inject
    if (
        source !== window ||
        source.origin === 'null' ||
        data.origin !== Origin.PROVIDER ||
        !Object.values(EXTERNAL).includes(data.message) ||
        // data.id should match the format indicated on BlankProvider.js because it could be set maliciously by a web page
        // Regex validates the following format
        // `${Date.now()}.${++this._requestId}` --> 1694708163916.8
        !/^(\d+)\.\d+$/.test(data.id)
    ) {
        return;
    }

    // Wrapper to retry failed messages with exponential backoff
    const postMessage = async (
        data: WindowTransportRequestMessage,
        retryCount = 0
    ): Promise<void> => {
        const MAX_RETRIES = 10;
        const message =
            data && typeof data !== undefined
                ? JSON.parse(JSON.stringify(data))
                : data;
        try {
            if (!SW_ALIVE || !port) {
                // Port was reinitialized, force retry
                throw new Error('Service worker not active or port not initialized');
            }
            port.postMessage(message);
        } catch (error) {
            if (retryCount >= MAX_RETRIES) {
                console.error('Failed to deliver message after maximum retries:', message.message);

                // Notify the page about message delivery failure
                notifyPage({
                    signal: Signals.MESSAGE_DELIVERY_FAILED,
                    message: 'Failed to deliver message to extension',
                    data: { messageType: message.message }
                });
                return;
            }

            console.log(`Retry attempt ${retryCount + 1}/${MAX_RETRIES} for message:`, message.message);

            if (!SW_ALIVE || !port) {
                try {
                    init();
                } catch (e) {
                    // ignore reinit errors; retry loop will handle
                }
            }

            const backoffDelay = 100 * Math.pow(2, retryCount);
            await sleep(backoffDelay);

            return postMessage(message, retryCount + 1);
        }
    };

    return postMessage(data);
};

// Use a safer approach to add window message listener
window.addEventListener('message', (message) => {
    windowListener(message).catch(error => {
        console.warn('Error processing window message:', error);
    });
});

/**
 * Handles DOM operations safely
 */
// Note: helper currently unused, retained for future safe DOM operations
// function safeDOMOperation(operation: () => void): boolean {
//     try {
//         operation();
//         return true;
//     } catch (error) {
//         console.warn('DOM operation failed:', error);
//         return false;
//     }
// }

// Init function with improved connection resilience and state management
const init = () => {
    // Close existing port if it exists to prevent port leaks
    if (port) {
        try {
            port.disconnect();
        } catch (e) {
            console.warn('Error disconnecting existing port:', e);
        }
    }

    try {
        // Setup port connection with error handling
        port = chrome.runtime.connect({ name: Origin.PROVIDER });

        // Set callback to send any messages from the extension back to the page
        port.onMessage.addListener((message: any): void => {
            // Clone message to avoid issues with structured cloning
            const nmessage = {
                ...(message && typeof message !== undefined
                    ? JSON.parse(JSON.stringify(message))
                    : message),
                origin: Origin.BACKGROUND,
            };

            try {
                window.postMessage(nmessage, window.location.href);
            } catch (error: any) {
                console.warn('Error posting message to window:', error);
                // Don't throw here - we want to be resilient to errors
            }
        });

        if (isManifestV3()) {
            // Handle disconnection with improved reconnection logic
            port.onDisconnect.addListener(() => {
                const lastError = chrome.runtime.lastError;

                initMutex.runExclusive(async () => {
                    console.log('Port disconnection detected',
                        lastError ? `Error: ${lastError.message}` : '');

                    SW_ALIVE = false;

                    // Store reconnection attempts to prevent infinite loop
                    let reconnectAttempts = 0;
                    const MAX_RECONNECT_ATTEMPTS = 5;

                    // Wait for service worker to potentially restart
                    await sleep(200);

                    // Attempt to reconnect with backoff strategy
                    while (SW_ALIVE === false && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                        console.log(`Waiting for SW to be restarted... Attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}`);
                        // Exponential backoff for reconnection attempts
                        await sleep(100 * Math.pow(2, reconnectAttempts));
                        await swKeepAlive(); // Check if service worker is back
                        reconnectAttempts++;
                    }

                    if (SW_ALIVE && !portReinitialized) {
                        console.log('Reinitializing port connection...');

                        // Reinitialize the connection
                        init();

                        // Signal SW_REINIT in case there were active subscriptions
                        notifyPage({
                            signal: Signals.SW_REINIT,
                            message: 'Service worker reinitialized'
                        });
                    } else if (!SW_ALIVE) {
                        console.warn('Failed to reconnect to service worker after multiple attempts');
                        // Notify user that they may need to refresh the page
                        notifyPage({
                            signal: Signals.SW_UNAVAILABLE,
                            message: 'Extension service worker unavailable. Please refresh the page.'
                        });
                    }
                });
            });
        }
    } catch (error) {
        console.error('Failed to initialize port connection:', error);
        // Set a timer to retry initialization
        setTimeout(() => {
            if (!port || !SW_ALIVE) {
                init();
            }
        }, 2000);
    }

    portReinitialized = true;
};

init();
