import {
    EXTERNAL,
    CONTENT,
    Origin,
    WindowTransportRequestMessage,
} from '@block-wallet/background/utils/types/communication';
import { checkScriptLoad } from './utils/site';
import log from 'loglevel';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import blankProvider from '../../../dist/blankProvider.js?raw';

let providerOverridden = false;

function injectProvider() {
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

window.addEventListener('ethereum#initialized', (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail !== 'isBlockWallet') {
        providerOverridden = true;
    } else {
        providerOverridden = false;
    }
});

injectProvider();

// Check background settings for script load
chrome.runtime.sendMessage(
    { message: CONTENT.SHOULD_INJECT },
    (response: { shouldInject: boolean }): void => {
        const error = chrome.runtime.lastError;
        const shouldLoad = checkScriptLoad();
        if (
            (response.shouldInject !== true || shouldLoad !== true || error) &&
            //If provider has been overridden by another wallet, then remove connection.
            providerOverridden
        ) {
            port.disconnect();
            window.removeEventListener('message', windowListenter);
            log.warn('BlockWallet: Provider not injected due to user setting.');
        } else if (providerOverridden) {
            injectProvider();
        }
    }
);

// Setup port connection
const port = chrome.runtime.connect({ name: Origin.PROVIDER });

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
