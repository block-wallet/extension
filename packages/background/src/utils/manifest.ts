export const isManifestV3 = () => {
    try {
        return chrome.runtime.getManifest().manifest_version === 3;
    } catch {
        return true;
    }
};

/**
 * Forces a tab navigation to a specific internal URL
 * This is used as a workaround for the Ledger connection issue in MV3
 * 
 * @param url The URL to navigate to
 * @param state Optional state to pass to the URL
 */
export const forceNavigateTab = async (url: string, state?: any): Promise<void> => {
    try {
        // In MV3, we need to find the extension's active tab and redirect it
        if (isManifestV3()) {
            const extensionTabs = await chrome.tabs.query({
                url: chrome.runtime.getURL('*')
            });

            // Find the tab.html tab
            const extensionTab = extensionTabs.find(tab =>
                tab.url?.includes('tab.html') && tab.active
            );

            if (extensionTab && extensionTab.id) {
                // Store state in session storage if provided
                if (state) {
                    await chrome.storage.session.set({
                        'navigation_state': state
                    });
                }

                // Execute a script to navigate
                await chrome.scripting.executeScript({
                    target: { tabId: extensionTab.id },
                    func: (url) => {
                        window.location.href = url;
                    },
                    args: [url]
                });

                return;
            }
        }

        // Fallback or non-MV3: do nothing as navigation should happen normally
    } catch (e) {
        console.error('Failed to force navigate tab:', e);
    }
};
