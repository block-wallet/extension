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
        const err = chrome.runtime.lastError;
        if (err) {
            log.info('Error keeping alive:', err.message || err);
        }
    });
}, SW_KEEP_ALIVE_INTERVAL);

// Setup port connection
const port = chrome.runtime.connect({ name: Origin.PROVIDER });

// Check background settings for script load
chrome.runtime.sendMessage(
    { message: CONTENT.SHOULD_INJECT },
    (response: { shouldInject: boolean }): void => {
        const error = chrome.runtime.lastError;
        const shouldLoad = checkScriptLoad();

        if (response.shouldInject !== true || shouldLoad !== true || error) {
            port.disconnect();
            window.removeEventListener('message', windowListenter);
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

// Send any messages from the extension back to the page
port.onMessage.addListener((message): void => {
    window.postMessage(
        { ...message, origin: Origin.BACKGROUND },
        window.location.href
    );
});

// Setup window listener
const windowListenter = ({
    data,
    source,
}: MessageEvent<WindowTransportRequestMessage>): void => {
    // Only allow messages from our window, by the inject
    if (
        source !== window ||
        data.origin !== Origin.PROVIDER ||
        !Object.values(EXTERNAL).includes(data.message)
    ) {
        return;
    }

    port.postMessage(data);
};

window.addEventListener('message', windowListenter);
