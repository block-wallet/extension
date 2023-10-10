import { ONBOARDING_TAB_NAME } from './constants/tab';
import browser from 'webextension-polyfill';

/**
 * Checks for runtime error
 *
 */
const checkForError = () => {
    const error = browser.runtime.lastError;
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
        if (!browser.windows || error) {
            return resolve(undefined);
        }
        browser.windows.getCurrent().then((window) => {
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
        return browser.windows.remove(windowId);
    }
};

/**
 * Closes the specified tab
 *
 */
export const closeTab = (tabId: number): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        browser.tabs.remove(tabId).then(() => {
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
        browser.windows.update(windowId, { focused: true }).then(() => {
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
export const getActiveTabs = (): Promise<browser.Tabs.Tab[]> => {
    return new Promise<browser.Tabs.Tab[]>((resolve, reject) => {
        browser.tabs.query({ active: true }).then((tabs) => {
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
export const getAllWindows = (): Promise<browser.Windows.Window[]> => {
    return new Promise<browser.Windows.Window[]>((resolve, reject) => {
        browser.windows.getAll().then((windows) => {
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
export const getCurrentTab = (): Promise<browser.Tabs.Tab | undefined> => {
    return new Promise<browser.Tabs.Tab | undefined>((resolve, reject) => {
        browser.tabs &&
            browser.tabs.getCurrent().then((tab) => {
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
export const getLastFocusedWindow = (): Promise<browser.Windows.Window> => {
    return new Promise<browser.Windows.Window>((resolve, reject) => {
        browser.windows.getLastFocused().then((windowObject) => {
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
    return browser.runtime.getManifest().version;
};

/**
 * Opens the app in a new tab
 *
 */
export const openExtensionInBrowser = (
    route: string | null = null,
    queryString = null
): void => {
    let extensionURL = browser.runtime.getURL(ONBOARDING_TAB_NAME);

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
    options: browser.Tabs.CreateCreatePropertiesType
): Promise<browser.Tabs.Tab> => {
    return new Promise<browser.Tabs.Tab>((resolve, reject) => {
        browser.tabs.create(options).then((newTab) => {
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
    options: browser.Windows.CreateCreateDataType
): Promise<browser.Windows.Window | undefined> => {
    return new Promise<browser.Windows.Window | undefined>(
        (resolve, reject) => {
            browser.windows.create(options).then((newWindow) => {
                const error = checkForError();
                if (error) {
                    return reject(error);
                }
                return resolve(newWindow);
            });
        }
    );
};

/**
 * Updates the selected window with the new parameters.
 *
 */
export const updateWindow = (
    windowId: number,
    updateInfo: browser.Windows.UpdateUpdateInfoType
): Promise<browser.Windows.Window | undefined> => {
    return new Promise<browser.Windows.Window | undefined>(
        (resolve, reject) => {
            browser.windows.update(windowId, updateInfo).then((newWindow) => {
                const error = checkForError();
                if (error) {
                    return reject(error);
                }
                return resolve(newWindow);
            });
        }
    );
};

/**
 * Highlights the specified tab
 *
 */
export const switchToTab = (
    tabId: number
): Promise<browser.Tabs.Tab | undefined> => {
    return new Promise<browser.Tabs.Tab | undefined>((resolve, reject) => {
        browser.tabs.update(tabId, { highlighted: true }).then((tab) => {
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
export const getPlatformInfo = (): Promise<browser.Runtime.PlatformInfo> => {
    return new Promise<browser.Runtime.PlatformInfo>((resolve, reject) => {
        browser.runtime.getPlatformInfo().then((info) => {
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
