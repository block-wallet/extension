import { incompatibleSites } from './constants/incompatibleSites';

/**
 * Check if the site is on the list of incompatibleSites
 */
export const isCompatible = (): boolean => {
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
        if (
            document.readyState === 'complete' ||
            document.readyState === 'interactive'
        ) {
            resolve(getIconFromDom());
        } else {
            const domContentLoadedHandler = async () => {
                resolve(getIconFromDom());

                window.removeEventListener(
                    'DOMContentLoaded',
                    domContentLoadedHandler
                );
            };

            window.addEventListener(
                'DOMContentLoaded',
                domContentLoadedHandler
            );
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

    const icons: NodeListOf<HTMLLinkElement> = document.querySelectorAll(
        'head > link[rel~="icon"]'
    );

    for (const icon of icons) {
        if (icon && (await isValidImage(icon.href))) {
            return icon.href;
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
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        } catch (error) {
            resolve(false);
        }
    });

    img.remove();

    return isValid;
};
