import {
    ExtensionInstances,
    Origin,
    ProviderInstances,
} from '../utils/types/communication';
import { closeExtensionInstance } from '../utils/popup';
import { isOnboardingTabUrl } from '../utils/window';
import { v4 as uuid } from 'uuid';
import BlankController from '../controllers/BlankController';
import log from 'loglevel';

export const extensionInstances: ExtensionInstances = {};
export const providerInstances: ProviderInstances = {};

/**
 * New connection setup function
 *
 * @param port new connected port
 * @param blankController blank controller running instance
 */
export const setupConnection = (
    port: chrome.runtime.Port,
    blankController: BlankController
): void => {
    console.log(`[Connection] setupConnection ENTRY - port.name: ${port.name}, sender.url: ${port.sender?.url}`);
    log.info(`[Connection] setupConnection called - port.name: ${port.name}, sender.url: ${port.sender?.url}`);

    // Ignore Trezor content script messages
    if (port.name === Origin.TREZOR_CONNECT) {
        console.log('[Connection] Ignoring Trezor connection');
        log.info('[Connection] Ignoring Trezor connection');
        return;
    }

    // Validate origin
    if (port.name !== Origin.EXTENSION && port.name !== Origin.PROVIDER) {
        log.error(`[Connection] Unknown connection origin: ${port.name}`);
        throw new Error('Unknown connection origin');
    }

    const id = uuid();
    log.info(`[Connection] Generated connection ID: ${id} for origin: ${port.name}`);

    if (port.name === Origin.EXTENSION) {
        log.info(`[Connection] Setting up EXTENSION connection - id: ${id}, URL: ${port.sender?.url}`);
        // Close any other open instance
        for (const instance in extensionInstances) {
            // Ignore if it is an onboarding tab
            if (
                !isOnboardingTabUrl(
                    extensionInstances[instance].port.sender?.url
                )
            ) {
                closeExtensionInstance(instance);
            }
        }

        extensionInstances[id] = { port };

        log.debug('Extension instance connected', id);
    } else {
        if (
            !port.sender?.url ||
            typeof port.sender.tab?.id !== 'number' ||
            typeof port.sender.tab.windowId !== 'number'
        ) {
            throw new Error('Error initializing provider');
        }

        const url = new URL(port.sender.url);

        providerInstances[id] = {
            port,
            tabId: port.sender.tab.id,
            windowId: port.sender.tab.windowId,
            origin: url.origin,
            siteMetadata: {
                iconURL: null,
                name: url.hostname,
            },
        };

        log.debug(url.origin, 'connected', id);
    }

    // Setup listeners
    console.log(`[Connection] Setting up message listeners for connection ${id}`);
    const messageListener = (message: any, port: chrome.runtime.Port) => {
        console.log(`[Connection] Message received for ${id}:`, message);
        blankController.handler(message, port, id);
    };

    port.onMessage.addListener(messageListener);
    console.log(`[Connection] Message listener added for connection ${id}`);

    port.onDisconnect.addListener((port: chrome.runtime.Port) => {
        // Check for error
        const error = chrome.runtime.lastError;

        if (error) {
            log.error('Error on port disconnection', error.message || error);
        }

        // Remove message listener
        port.onMessage.removeListener(messageListener);

        // Remove from open instances
        if (port.name === Origin.EXTENSION) {
            delete extensionInstances[id];
            log.debug('Extension instance disconnected', id);
        } else {
            if (port.name === Origin.PROVIDER) {
                delete providerInstances[id];
                log.debug('Site disconnected', id);
            }
        }
    });
};
