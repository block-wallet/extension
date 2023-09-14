import { Origin } from '../../../utils/types/communication';
import browser from 'webextension-polyfill';

// Setup port connection
let port: browser.Runtime.Port | null = browser.runtime.connect({
    name: Origin.TREZOR_CONNECT,
});

// Process any messages from the extension to the trezor page
port.onMessage.addListener((message: any) => {
    window.postMessage(message, window.location.origin);
});

// Remove reference to port instance on disconnect
port.onDisconnect.addListener(() => {
    port = null;
});

// Send messages from the trezor page back to the extension
window.addEventListener('message', (ev: MessageEvent) => {
    if (port && ev.source === window && ev.data) {
        port.postMessage({ data: ev.data });
    }
});
