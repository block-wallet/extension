import {
    CONTENT,
    EXTERNAL,
    Origin,
    WindowTransportRequestMessage,
} from '@block-wallet/background/utils/types/communication';
import log from 'loglevel';
import { checkScriptLoad } from './utils/site';

const SW_KEEP_ALIVE_INTERVAL = 10;
setInterval(() => {
    chrome.runtime.sendMessage({ message: CONTENT.SW_KEEP_ALIVE }, () => {
        if (chrome.runtime.lastError) {
            log.info(
                'Error keeping alive:',
                chrome.runtime.lastError.message || chrome.runtime.lastError
            );
        }
    });
}, SW_KEEP_ALIVE_INTERVAL);

function sleep(ms: number): Promise<unknown> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

let port: chrome.runtime.Port | undefined = undefined;

// Check background settings for script load
chrome.runtime.sendMessage(
    { message: CONTENT.SHOULD_INJECT },
    (response: { shouldInject: boolean }): void => {
        const error = chrome.runtime.lastError;
        const shouldLoad = checkScriptLoad();

        if (
            port &&
            (response.shouldInject !== true || shouldLoad !== true || error)
        ) {
            port.disconnect();
            window.removeEventListener('message', windowListener);
            log.warn('BlockWallet: Provider not injected due to user setting.');
        } else {
            const container = document.head || document.documentElement;
            const script = document.createElement('script');

            script.type = 'text/javascript';
            script.src = chrome.runtime.getURL('blankProvider.js');
            script.setAttribute('async', 'false');
            script.onload = () => {
                container.removeChild(script);
            };
            container.insertBefore(script, container.children[0]);
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
        data.origin !== Origin.PROVIDER ||
        !Object.values(EXTERNAL).includes(data.message)
    ) {
        return;
    }

    // Wrapper to retry failed messages
    const postMessage = async (
        data: WindowTransportRequestMessage
    ): Promise<void> => {
        try {
            if (!port) {
                // Port was reinitialized, force retry
                throw new Error();
            }
            port.postMessage(data);
        } catch (error) {
            // If this fails due to SW being inactive, retry
            await sleep(30);
            log.debug('port was reinitialized');
            return postMessage(data);
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
    port = chrome.runtime.connect({ name: Origin.PROVIDER });

    // Set callback to send any messages from the extension back to the page
    port.onMessage.addListener((message): void => {
        window.postMessage(
            { ...message, origin: Origin.BACKGROUND },
            window.location.href
        );
    });
    port.onDisconnect.addListener(() => {
        log.info('SW went inactive, reinitializing...');
        init();
    });
};

init();
