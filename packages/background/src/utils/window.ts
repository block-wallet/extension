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
        chrome.windows.getCurrent().then((window) => {
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
        chrome.tabs.remove(tabId).then(() => {
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
        chrome.windows.update(windowId, { focused: true }).then(() => {
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
        chrome.tabs.query({ active: true }).then((tabs) => {
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
        chrome.windows.getAll().then((windows) => {
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
            chrome.tabs.getCurrent().then((tab) => {
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
        chrome.windows.getLastFocused().then((windowObject) => {
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
        chrome.tabs.create(options).then((newTab) => {
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
        chrome.windows.create(options).then((newWindow) => {
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
        chrome.windows.update(windowId, updateInfo).then((newWindow) => {
            const error = checkForError();
            if (error) {
                return reject(error);
            }
            return resolve(newWindow);
        });
    });
};

/**
 * Closes a specific window by id
 *
 */
export const closeWindowById = (windowId: number): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        chrome.windows.remove(windowId).then(() => {
            const error = checkForError();
            if (error) {
                reject(error);
            }
            resolve();
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
        chrome.tabs.update(tabId, { highlighted: true }).then((tab) => {
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
        chrome.runtime.getPlatformInfo().then((info) => {
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

/**
 * Onboarding popup helpers
 */
let onboardingListenersInitialized = false;

/**
 * Opens the onboarding UI in a focused popup window and sets session flags.
 * Returns the created window id.
 */
export const openOnboardingPopup = async (
    route: string | null = null,
    queryString: string | null = null
): Promise<number | undefined> => {
    if (chrome.storage?.session) {
        const { onboarding_active, onboarding_window_id } =
            await chrome.storage.session.get([
                'onboarding_active',
                'onboarding_window_id',
            ]);
        if (onboarding_active && typeof onboarding_window_id === 'number') {
            try {
                await focusWindow(onboarding_window_id);
                return onboarding_window_id;
            } catch (_e) {
                await chrome.storage.session.set({
                    onboarding_active: false,
                    onboarding_window_id: undefined,
                });
            }
        }
    }

        let url = chrome.runtime.getURL(ONBOARDING_TAB_NAME);
        if (queryString) {
            url += `?${queryString}`;
        }
        if (route) {
            url += `#${route}`;
        }

        const width = 1000;
        const height = 740;
        let left = 0;
        let top = 0;

        try {
            const win = await getLastFocusedWindow();
            if (
                win.top !== undefined &&
                win.left !== undefined &&
                win.width !== undefined
            ) {
                top = win.top;
                left = win.left + (win.width - width);
            }
        } catch (_e) {
            const { screenX, screenY, outerWidth } = window;
            top = Math.max(screenY, 0);
            left = Math.max(screenX + (outerWidth - width), 0);
        }

        const newWindow = await openWindow({
            url,
            type: 'popup',
            state: 'normal',
            width,
            height,
            left,
            top,
            focused: true,
        });

        if (newWindow?.state === 'fullscreen' && newWindow.id) {
            await updateWindow(newWindow.id, {
                state: 'normal',
                width,
                height,
                left,
                top,
                focused: true,
            });
        }

        if (newWindow?.id !== undefined && chrome.storage?.session) {
            await chrome.storage.session.set({
                onboarding_active: true,
                onboarding_window_id: newWindow.id,
            });
        }

        setupOnboardingFocusGuard();

        return newWindow?.id;
};

/**
 * Closes the onboarding popup window (if open) and clears session flags.
 */
export const closeOnboardingWindow = async (): Promise<void> => {
    try {
        if (!chrome.storage?.session) return;
        const result = await chrome.storage.session.get([
            'onboarding_window_id',
            'onboarding_active',
        ]);
        const windowId = result.onboarding_window_id as number | undefined;
        if (windowId !== undefined) {
            try {
                await closeWindowById(windowId);
            } catch (_e) {
                // ignore if already closed
            }
        }
        await chrome.storage.session.set({
            onboarding_active: false,
            onboarding_window_id: undefined,
        });
    } catch (_e) {
        // ignore cleanup errors
    }
};

/**
 * Ensures onboarding focus guard listeners are installed. They will refocus
 * the onboarding window if it loses focus and reopen it if the user closes it
 * before setup is complete.
 */
export const setupOnboardingFocusGuard = (): void => {
    if (onboardingListenersInitialized) return;
    onboardingListenersInitialized = true;

    try {
        chrome.windows.onRemoved.addListener(async (removedWindowId) => {
            try {
                if (!chrome.storage?.session) return;
                const { onboarding_active, onboarding_window_id } =
                    await chrome.storage.session.get([
                        'onboarding_active',
                        'onboarding_window_id',
                    ]);
                if (!onboarding_active || typeof onboarding_window_id !== 'number') return;
                if (removedWindowId === onboarding_window_id) {
                    await chrome.storage.session.set({
                        onboarding_active: false,
                        onboarding_window_id: undefined,
                    });
                }
            } catch (_e) {
                // ignore
            }
        });
    } catch (_e) {
        // ignore listener setup errors
    }
};
