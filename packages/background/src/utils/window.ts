import { ONBOARDING_TAB_NAME } from './constants/tab';

/**
 * Checks for runtime error
 *
 */
const checkForError = () => {
    const error = chrome.runtime.lastError;
    if (!error) {
        return undefined;
    }
    return new Error(error.message);
};

/**
 *  Returns the current browser windowId
 */
export const getCurrentWindowId = (): Promise<number | undefined> => {
    return new Promise((resolve) => {
        const error = checkForError();
        //do  not fail on errors
        if (!chrome.windows || error) {
            return resolve(undefined);
        }
        chrome.windows.getCurrent((window) => {
            return resolve(window.id);
        });
    });
};

/**
 * Closes current active window
 *
 */
export const closeCurrentWindow = async (): Promise<void> => {
    const windowId = await getCurrentWindowId();
    const error = checkForError();
    if (error) {
        return Promise.reject(error);
    }
    if (windowId) {
        return chrome.windows.remove(windowId);
    }
};

/**
 * Closes the specified tab
 *
 */
export const closeTab = (tabId: number): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        chrome.tabs.remove(tabId, () => {
            const error = checkForError();
            if (error) {
                reject(error);
            }
            resolve();
        });
    });
};

/**
 * Selects the specified window
 *
 */
export const focusWindow = (windowId: number): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        chrome.windows.update(windowId, { focused: true }, () => {
            const error = checkForError();
            if (error) {
                reject(error);
            }
            resolve();
        });
    });
};

/**
 * Returns active windows
 *
 */
export const getActiveTabs = (): Promise<chrome.tabs.Tab[]> => {
    return new Promise<chrome.tabs.Tab[]>((resolve, reject) => {
        chrome.tabs.query({ active: true }, (tabs) => {
            const error = checkForError();
            if (error) {
                reject(error);
            }
            resolve(tabs);
        });
    });
};

/**
 * Returns all open windows
 *
 */
export const getAllWindows = (): Promise<chrome.windows.Window[]> => {
    return new Promise<chrome.windows.Window[]>((resolve, reject) => {
        chrome.windows.getAll((windows) => {
            const error = checkForError();
            if (error) {
                reject(error);
            }
            resolve(windows);
        });
    });
};

/**
 * Returns the current selected tab
 *
 */
export const getCurrentTab = (): Promise<chrome.tabs.Tab | undefined> => {
    return new Promise<chrome.tabs.Tab | undefined>((resolve, reject) => {
        chrome.tabs &&
            chrome.tabs.getCurrent((tab) => {
                const error = checkForError();
                if (error) {
                    reject(error);
                }
                resolve(tab);
            });
    });
};

/**
 * Returns the last focused window
 *
 */
export const getLastFocusedWindow = (): Promise<chrome.windows.Window> => {
    return new Promise<chrome.windows.Window>((resolve, reject) => {
        chrome.windows.getLastFocused((windowObject) => {
            const error = checkForError();
            if (error) {
                reject(error);
            }
            resolve(windowObject);
        });
    });
};

/**
 * Returns the block wallet's version
 *
 */
export const getVersion = (): string => {
    return chrome.runtime.getManifest().version;
};

/**
 * Opens the app in a new tab
 *
 */
export const openExtensionInBrowser = (
    route: string | null = null,
    queryString = null
): void => {
    let extensionURL = chrome.runtime.getURL(ONBOARDING_TAB_NAME);

    if (queryString) {
        extensionURL += `?${queryString}`;
    }

    if (route) {
        extensionURL += `#${route}`;
    }

    openTab({ url: extensionURL });
};

/**
 * Opens a new tab with the specified options
 *
 * @param options settings for the new tab
 */
export const openTab = (
    options: chrome.tabs.CreateProperties
): Promise<chrome.tabs.Tab> => {
    return new Promise<chrome.tabs.Tab>((resolve, reject) => {
        chrome.tabs.create(options, (newTab) => {
            const error = checkForError();
            if (error) {
                reject(error);
            }
            resolve(newTab);
        });
    });
};

/**
 * Creates a new window with the specified options
 *
 */
export const openWindow = (
    options: chrome.windows.CreateData
): Promise<chrome.windows.Window | undefined> => {
    return new Promise<chrome.windows.Window | undefined>((resolve, reject) => {
        chrome.windows.create(options, (newWindow) => {
            const error = checkForError();
            if (error) {
                return reject(error);
            }
            return resolve(newWindow);
        });
    });
};

/**
 * Updates the selected window with the new parameters.
 *
 */
export const updateWindow = (
    windowId: number,
    updateInfo: chrome.windows.UpdateInfo
): Promise<chrome.windows.Window | undefined> => {
    return new Promise<chrome.windows.Window | undefined>((resolve, reject) => {
        chrome.windows.update(windowId, updateInfo, (newWindow) => {
            const error = checkForError();
            if (error) {
                return reject(error);
            }
            return resolve(newWindow);
        });
    });
};

/**
 * Highlights the specified tab
 *
 */
export const switchToTab = (
    tabId: number
): Promise<chrome.tabs.Tab | undefined> => {
    return new Promise<chrome.tabs.Tab | undefined>((resolve, reject) => {
        chrome.tabs.update(tabId, { highlighted: true }, (tab) => {
            const error = checkForError();
            if (error) {
                reject(error);
            }
            resolve(tab);
        });
    });
};

/**
 * Returns the platform info
 *
 */
export const getPlatformInfo = (): Promise<chrome.runtime.PlatformInfo> => {
    return new Promise<chrome.runtime.PlatformInfo>((resolve, reject) => {
        chrome.runtime.getPlatformInfo((info) => {
            const error = checkForError();
            if (error) {
                reject(error);
            }
            resolve(info);
        });
    });
};

export function isOnboardingTabUrl(tabUrl: string | undefined): boolean {
    if (!tabUrl) {
        return false;
    }
    return tabUrl.includes(ONBOARDING_TAB_NAME);
}
