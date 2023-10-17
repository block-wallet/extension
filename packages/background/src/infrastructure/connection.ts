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
import browser from 'webextension-polyfill';

export const extensionInstances: ExtensionInstances = {};
export const providerInstances: ProviderInstances = {};

/**
 * New connection setup function
 *
 * @param port new connected port
 * @param blankController blank controller running instance
 */
export const setupConnection = (
    port: browser.Runtime.Port,
    blankController: BlankController
): void => {
    // Ignore Trezor content script messages
    if (port.name === Origin.TREZOR_CONNECT) {
        return;
    }

    // Validate origin
    if (port.name !== Origin.EXTENSION && port.name !== Origin.PROVIDER) {
        throw new Error('Unknown connection origin');
    }

    const id = uuid();

    if (port.name === Origin.EXTENSION) {
        log.debug('New instance URL', port.sender?.url);
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
    const messageListener = (message: any, port: browser.Runtime.Port) => {
        blankController.handler(message, port, id);
    };

    port.onMessage.addListener(messageListener);

    port.onDisconnect.addListener((port: browser.Runtime.Port) => {
        // Check for error
        const error = browser.runtime.lastError;

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
