import {
    focusWindow,
    getLastFocusedWindow,
    openWindow,
    switchToTab,
    getPlatformInfo,
    updateWindow,
} from './window';
import { extensionInstances } from '../infrastructure/connection';
import { Mutex } from 'async-mutex';
import { PlatformOS } from './types/platform';
import {
    BackgroundActions,
    Messages,
    TransportResponseMessage,
} from './types/communication';
import log from 'loglevel';

// Define window size for each os
const windowSize: { [os in PlatformOS]: { height: number; width: number } } = {
    win: { height: 639, width: 373 },
    mac: { height: 630, width: 358 },
    linux: { height: 600, width: 357 },
    android: { height: 600, width: 357 },
    cros: { height: 600, width: 357 },
    openbsd: { height: 600, width: 357 },
};

// Define a new mutex for the open popup function
const mutex: Mutex = new Mutex();

/**
 * Util to display the extension.
 * A new instance will be created in a window if there isn't one already open.
 * Otherwise, it will focus the current one.
 */
export const openPopup = async (): Promise<void> => {
    const release = await mutex.acquire();

    try {
        const openTab = getOpenTab();

        // Check if there is an open extension tab
        if (openTab) {
            focusWindow(openTab.windowId);
            switchToTab(openTab.tabId);
        } else if (!isExtensionOpen()) {
            // Open a new window if the extension is not open
            await openExtensionWindow();
        }
    } finally {
        setTimeout(() => release(), 1000);
    }
};

/**
 * Checks if the extension is open
 */
const isExtensionOpen = (): boolean => {
    return extensionInstances && Object.keys(extensionInstances).length !== 0;
};

/**
 * Returns the tab id and window id of the open extension window
 * or null if it's an onboarding tab or there isn't one.
 */
const getOpenTab = (): { tabId: number; windowId: number } | null => {
    for (const instance in extensionInstances) {
        const tab = extensionInstances[instance].port.sender?.tab;
        const isOnboardingTab =
            extensionInstances[instance].port.sender?.url?.includes('tab.html');

        if (tab && tab.id && tab.windowId && !isOnboardingTab) {
            return {
                tabId: tab.id,
                windowId: tab.windowId,
            };
        }
    }

    return null;
};

/**
 * Creates a new window with the extension
 */
const openExtensionWindow = async () => {
    const os = (await getPlatformInfo()).os as PlatformOS;
    const width = windowSize[os].width;
    const height = windowSize[os].height;
    let left = 0;
    let top = 0;

    try {
        const win = await getLastFocusedWindow();
        // Position window in top right corner of lastFocused window.
        if (
            win.top !== undefined &&
            win.left !== undefined &&
            win.width !== undefined
        ) {
            top = win.top;
            left = win.left + (win.width - width);
        }
    } catch (error) {
        /* The following properties will likely have irrelevant values.
         * They are requested from the background generated page that has no
         * physical dimensions. */
        const { screenX, screenY, outerWidth } = window;
        top = Math.max(screenY, 0);
        left = Math.max(screenX + (outerWidth - width), 0);
    }

    // Create new notification popup
    const newWindow = await openWindow({
        url: 'popup.html',
        type: 'popup',
        state: 'normal',
        width,
        height,
        left,
        top,
    });

    // Prevent popup going fullscreen on macOS
    if (newWindow?.state === 'fullscreen' && newWindow.id) {
        updateWindow(newWindow.id, {
            state: 'normal',
            width,
            height,
            left,
            top,
        });
    }
};

/**
 * Closes the given extension instance
 *
 * @param instanceId
 */
export const closeExtensionInstance = (instanceId: string): void => {
    try {
        extensionInstances[instanceId].port.postMessage({
            id: BackgroundActions.CLOSE_WINDOW,
        } as TransportResponseMessage<typeof Messages.BACKGROUND.ACTION>);
    } catch (error) {
        log.error(`Couldn't close instance ${instanceId}`);
    }
};
