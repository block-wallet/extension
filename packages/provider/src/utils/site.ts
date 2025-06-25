/**
 * Check if the site is on the list of incompatibleSites
 */
export const isCompatible = (incompatibleSites: string[]): boolean => {
    for (let i = 0; i < incompatibleSites.length; i++) {
        if (
            window.location.hostname === incompatibleSites[i] ||
            window.location.hostname.endsWith('.' + incompatibleSites[i])
        ) {
            return false;
        }
    }
    return true;
};

/**
 * Check for unallowed file extension
 */
const checkExtension = (): boolean => {
    const fileExtensions = [/\.xml$/u, /\.pdf$/u];

    for (let i = 0; i < fileExtensions.length; i++) {
        if (fileExtensions[i].test(window.location.pathname)) {
            return false;
        }
    }

    return true;
};

/**
 * Checks the documentElement of the current document
 */
const documentElementCheck = (): boolean => {
    const documentElement = window.document.documentElement.nodeName;

    if (documentElement) {
        return documentElement.toLowerCase() === 'html';
    }

    return true;
};

/**
 * Checks the doctype of the current document if it exists
 */
const checkDocType = (): boolean => {
    const { doctype } = window.document;

    if (doctype) {
        return doctype.name === 'html';
    }

    return true;
};

/**
 * Helper function with checks to do before loading the script
 */
export const checkScriptLoad = (): boolean => {
    return checkDocType() && checkExtension() && documentElementCheck();
};

/**
 * Returns site favicon data
 */
export const getIconData = async (): Promise<string | null> => {
    return new Promise((resolve) => {
        const tryGetIcon = async () => {
            const iconUrl = await getIconFromDom();
            resolve(iconUrl);
        };

        // Try immediately if DOM is ready
        if (
            document.readyState === 'complete' ||
            document.readyState === 'interactive'
        ) {
            tryGetIcon();
        } else {
            // Wait for DOM to be ready
            const domContentLoadedHandler = async () => {
                await tryGetIcon();
                window.removeEventListener(
                    'DOMContentLoaded',
                    domContentLoadedHandler
                );
            };

            window.addEventListener(
                'DOMContentLoaded',
                domContentLoadedHandler
            );

            // Also try after a short delay to catch late-loading favicons
            setTimeout(tryGetIcon, 1000);
        }
    });
};

/**
 * Extracts an icon for the site from the DOM
 *
 * @returns Icon url or null if there isn't a valid one
 */
const getIconFromDom = async (): Promise<string | null> => {
    const { document } = window;

    // Try multiple favicon selectors in order of preference
    const selectors = [
        'link[rel="icon"]',
        'link[rel="shortcut icon"]',
        'link[rel~="icon"]',
        'link[rel="apple-touch-icon"]',
        'link[rel="apple-touch-icon-precomposed"]',
        'link[rel="mask-icon"]'
    ];

    for (const selector of selectors) {
        const icons: NodeListOf<HTMLLinkElement> = document.querySelectorAll(selector);

        for (const icon of icons) {
            if (icon && icon.href) {
                if (await isValidImage(icon.href)) {
                    return icon.href;
                }
            }
        }
    }

    // Fallback: try the standard favicon paths
    const origin = window.location.origin;
    const fallbackPaths = [
        `${origin}/favicon.png`,
        `${origin}/favicon.ico`,
        `${origin}/favicon.svg`
    ];

    for (const path of fallbackPaths) {
        if (await isValidImage(path)) {
            return path;
        }
    }

    return null;
};

/**
 * Checks if the given image loads correctly
 *
 * @param url Image source
 */
const isValidImage = async (url: string): Promise<boolean> => {
    const img = document.createElement('img');

    const isValid = await new Promise<boolean>((resolve) => {
        try {
            // Set timeout to avoid hanging on slow images
            const timeout = setTimeout(() => {
                resolve(false);
            }, 2000); // 2 second timeout

            img.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };

            img.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };

            // Try without crossOrigin first (for same-origin images)
            if (url.startsWith(window.location.origin)) {
                img.src = url;
            } else {
                // For cross-origin images, try with crossOrigin
                img.crossOrigin = 'anonymous';
                img.src = url;
            }
        } catch (error) {
            resolve(false);
        }
    });

    img.remove();

    return isValid;
};
