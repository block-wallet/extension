import {
    EXTERNAL,
    CONTENT,
    Origin,
    WindowTransportRequestMessage,
} from '@block-wallet/background/utils/types/communication';
import { Mutex } from 'async-mutex';
import log from 'loglevel';
import { SignalMessage, Signals } from './types';
import { checkScriptLoad } from './utils/site';
import browser from 'webextension-polyfill';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import blankProvider from '../../../dist/blankProvider.js?raw';
import { isManifestV3 } from '@block-wallet/background/utils/manifest';

let providerOverridden = false;

function injectProvider() {
    const injectableScript = blankProvider;
    const injectableScriptSourceMapURL = `//# sourceURL=${browser.runtime.getURL(
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

window.addEventListener('ethereum#initialized', (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail !== 'isBlockWallet') {
        providerOverridden = true;
    } else {
        providerOverridden = false;
    }
});

injectProvider();

const SW_KEEP_ALIVE_INTERVAL = 10;
let SW_ALIVE = false;
let portReinitialized = false;
let intervalRef: NodeJS.Timeout;

if (isManifestV3()) {
    intervalRef = setInterval(() => {
        browser.runtime
            .sendMessage({ message: CONTENT.SW_KEEP_ALIVE })
            .then(() => {
                if (browser.runtime.lastError) {
                    log.info(
                        'Error keeping alive:',
                        browser.runtime.lastError.message ||
                            browser.runtime.lastError
                    );
                    const err = browser.runtime.lastError.message || '';
                    SW_ALIVE = !err.includes('Receiving end does not exist');
                    portReinitialized = SW_ALIVE;
                } else {
                    SW_ALIVE = true;
                }
            });
    }, SW_KEEP_ALIVE_INTERVAL);
} else {
    SW_ALIVE = true;
}

function sleep(ms: number): Promise<unknown> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

let port: browser.Runtime.Port | undefined = undefined;
const initMutex: Mutex = new Mutex();

// Check background settings for script load
browser.runtime
    .sendMessage({ message: CONTENT.SHOULD_INJECT })
    .then((response: { shouldInject: boolean }): void => {
        const error = browser.runtime.lastError;
        const shouldLoad = checkScriptLoad();
        if (
            port &&
            (response.shouldInject !== true || shouldLoad !== true || error) &&
            //If provider has been overridden by another wallet, then remove connection.
            providerOverridden
        ) {
            if (isManifestV3() && intervalRef) {
                clearInterval(intervalRef);
            }
            port.disconnect();
            window.removeEventListener('message', windowListener);
            log.warn('BlockWallet: Provider not injected due to user setting.');
        } else if (providerOverridden) {
            injectProvider();
        }
    });

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
            log.warn(message, error);
            // If this fails due to SW being inactive, retry
            await sleep(30);
            log.debug('waiting for SW to startup...');
            return postMessage(message);
        }
    };

    return postMessage(data);
};

window.addEventListener('message', (message) => {
    windowListener(message);
});

// Init function
const init = () => {
    // Setup port connection
    port = browser.runtime.connect({ name: Origin.PROVIDER });

    // Set callback to send any messages from the extension back to the page
    port.onMessage.addListener((message: any): void => {
        const nmessage = {
            ...(message && typeof message !== undefined
                ? JSON.parse(JSON.stringify(message))
                : message),
            origin: Origin.BACKGROUND,
        };
        try {
            window.postMessage(nmessage, window.location.href);
        } catch (error: any) {
            log.warn(nmessage, error);
            throw error;
        }
    });

    if (isManifestV3()) {
        port.onDisconnect.addListener(() => {
            initMutex.runExclusive(async () => {
                log.info('port disconnection');
                SW_ALIVE = false; // If we've reached this point, we can't expect this to be false and wait until this has changed.
                await sleep(200);

                // Port has been disconnected, reinitialize once
                while (SW_ALIVE === false) {
                    log.debug('waiting for SW to be restarted...');
                    await sleep(100);
                }

                if (!portReinitialized) {
                    log.info('reinitializing port...');

                    init();

                    // Signal SW_REINIT in case there were active subscriptions
                    window.postMessage(
                        {
                            signal: Signals.SW_REINIT,
                            origin: Origin.BACKGROUND,
                        } as SignalMessage,
                        window.location.href
                    );
                }
            });
        });
    }
    portReinitialized = true;
};

init();
