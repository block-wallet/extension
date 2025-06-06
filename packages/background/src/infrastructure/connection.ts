import {
    ExtensionInstances,
    Origin,
    ProviderInstances,
} from '../utils/types/communication';
import { closeExtensionInstance } from '../utils/popup';
import { isOnboardingTabUrl } from '../utils/window';
import { v4 as uuid } from 'uuid';
import BlankController from '../controllers/BlankController';

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
    // Ignore Trezor content script messages
    if (port.name === Origin.TREZOR_CONNECT) {
        return;
    }

    // Validate origin
    if (port.name !== Origin.EXTENSION && port.name !== Origin.PROVIDER) {
        console.error(`[Connection] Unknown connection origin: ${port.name}`);
        throw new Error('Unknown connection origin');
    }

    const id = uuid();

    if (port.name === Origin.EXTENSION) {
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

    }

    // Setup listeners
    const messageListener = (message: any, port: chrome.runtime.Port) => {
        blankController.handler(message, port, id);
    };

    port.onMessage.addListener(messageListener);

    port.onDisconnect.addListener((port: chrome.runtime.Port) => {
        // Check for error
        const error = chrome.runtime.lastError;

        if (error) {
            console.error('Error on port disconnection', error.message || error);
        }

        // Remove message listener
        port.onMessage.removeListener(messageListener);

        // Remove from open instances
        if (port.name === Origin.EXTENSION) {
            delete extensionInstances[id];
        } else {
            if (port.name === Origin.PROVIDER) {
                delete providerInstances[id];
            }
        }
    });
};
