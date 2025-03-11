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

const EXTENSION_CONTEXT_INVALIDATED_CHROMIUM_ERROR =
    'Extension context invalidated.';

let providerOverridden = false;

function injectProvider() {
    if (!isManifestV3()) {
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

injectProvider();

// Keep-alive implementation with improved interval and error handling
const SW_KEEP_ALIVE_INTERVAL = 10000; // Increased to 10 seconds to reduce resource usage
let SW_ALIVE = false;
let EXTENSION_CONTEXT_VALID = true;
let portReinitialized = false;
let timeoutRef: NodeJS.Timeout;

function swKeepAlive() {
    return new Promise<void>((resolve) => {
        try {
            chrome.runtime.sendMessage(
                { message: CONTENT.SW_KEEP_ALIVE },
                () => {
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
                    } else {
                        SW_ALIVE = true;
                    }
                    resolve();
                }
            );
        } catch (e) {
            let message = `BlockWallet: ${e}`;
            if (e.message === EXTENSION_CONTEXT_INVALIDATED_CHROMIUM_ERROR) {
                EXTENSION_CONTEXT_VALID = false;
                message = `BlockWallet: Please refresh the page. ${e}`;
            }
            console.warn('swKeepAlive error', message); // Use warn instead of log
            resolve();
        }
    });
}

async function keepExtensionAlive() {
    await swKeepAlive();
    if (EXTENSION_CONTEXT_VALID) {
        // Clear any existing timeout to prevent multiple timers
        if (timeoutRef) {
            clearTimeout(timeoutRef);
        }
        timeoutRef = setTimeout(keepExtensionAlive, SW_KEEP_ALIVE_INTERVAL);
    }
}

// Only use keep-alive in Manifest V3, and ensure cleanup on page unload
if (isManifestV3()) {
    keepExtensionAlive();

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

// Check background settings for script load
chrome.runtime.sendMessage(
    { message: CONTENT.SHOULD_INJECT },
    (response: { shouldInject: boolean }): void => {
        const error = chrome.runtime.lastError;
        const shouldLoad = checkScriptLoad();
        if (
            port &&
            (response.shouldInject !== true || shouldLoad !== true || error) &&
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

// Setup window listener

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

    // Wrapper to retry failed messages
    const postMessage = async (
        data: WindowTransportRequestMessage
    ): Promise<void> => {
        const message =
            data && typeof data !== undefined
                ? JSON.parse(JSON.stringify(data))
                : data;
        try {
            if (!SW_ALIVE || !port) {
                // Port was reinitialized, force retry
                throw new Error();
            }
            port.postMessage(message);
        } catch (error) {
            console.log(message, error);
            // If this fails due to SW being inactive, retry
            await sleep(30);
            console.log('waiting for SW to startup...');
            return postMessage(message);
        }
    };

    return postMessage(data);
};

window.addEventListener('message', (message) => {
    windowListener(message);
});

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
                        await sleep(100 * Math.pow(2, reconnectAttempts));
                        await swKeepAlive(); // Check if service worker is back
                        reconnectAttempts++;
                    }

                    if (SW_ALIVE && !portReinitialized) {
                        console.log('Reinitializing port connection...');

                        // Reinitialize the connection
                        init();

                        // Signal SW_REINIT in case there were active subscriptions
                        window.postMessage(
                            {
                                signal: Signals.SW_REINIT,
                                origin: Origin.BACKGROUND,
                            } as SignalMessage,
                            window.location.href
                        );
                    } else if (!SW_ALIVE) {
                        console.warn('Failed to reconnect to service worker after multiple attempts');
                        // Notify user that they may need to refresh the page
                        window.postMessage(
                            {
                                signal: Signals.SW_UNAVAILABLE,
                                origin: Origin.BACKGROUND,
                                message: 'Extension service worker unavailable. Please refresh the page.'
                            } as SignalMessage,
                            window.location.href
                        );
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
