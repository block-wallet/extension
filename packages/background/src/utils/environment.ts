import log from 'loglevel';

/**
 * Checks if the current environment has DOM access
 * This is needed for hardware wallets that require UI interaction
 *
 * @returns {boolean} True if the environment has a document with createElement
 */
export const hasDomAccess = (): boolean => {
    try {
        // Check for document with element creation capability
        return typeof document !== 'undefined' &&
            document !== null &&
            typeof document.createElement === 'function';
    } catch (e) {
        // If any error occurs during the check, assume we don't have DOM access
        log.debug('Error checking DOM access:', e);
        return false;
    }
};

/**
 * Checks if the current environment is a service worker (MV3)
 *
 * @returns {boolean} True if running in a service worker context
 */
export const isServiceWorker = (): boolean => {
    try {
        return (
            // Check for service worker global scope
            typeof globalThis !== 'undefined' &&
            typeof (globalThis as any).ServiceWorkerGlobalScope !== 'undefined' &&
            globalThis instanceof (globalThis as any).ServiceWorkerGlobalScope
        );
    } catch (e) {
        log.debug('Error checking service worker environment:', e);
        return false;
    }
};

/**
 * Checks if the current environment is an offscreen document
 *
 * @returns {boolean} True if running in an offscreen document
 */
export const isOffscreenDocument = (): boolean => {
    try {
        // Check query parameters for offscreen flag
        if (typeof window !== 'undefined' && window.location) {
            const url = new URL(window.location.href);
            return url.pathname.includes('offscreen.html');
        }
        return false;
    } catch (e) {
        log.debug('Error checking offscreen document environment:', e);
        return false;
    }
};

/**
 * Checks if the current environment supports WebHID
 *
 * @returns {boolean} True if WebHID is available
 */
export const hasWebHIDSupport = (): boolean => {
    try {
        return typeof navigator !== 'undefined' &&
            navigator !== null &&
            'hid' in navigator;
    } catch (e) {
        log.debug('Error checking WebHID support:', e);
        return false;
    }
};

/**
 * Gets information about the current runtime environment
 *
 * @returns {object} Object with environment information
 */
export const getRuntimeEnvironment = (): {
    hasDOM: boolean;
    isServiceWorker: boolean;
    isOffscreenDocument: boolean;
    hasWebHID: boolean;
} => {
    return {
        hasDOM: hasDomAccess(),
        isServiceWorker: isServiceWorker(),
        isOffscreenDocument: isOffscreenDocument(),
        hasWebHID: hasWebHIDSupport()
    };
};

/**
 * Gets an environment variable value
 * In browser extension context, environment variables might be injected at build time
 *
 * @param key The environment variable key
 * @param defaultValue Optional default value if the environment variable is not set
 * @returns The environment variable value or default value
 */
export const getEnvironmentVariable = (key: string, defaultValue?: string): string | undefined => {
    try {
        // Try to get from process.env if available (build-time injection)
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }

        // For browser extensions, environment variables might be in globalThis
        if (typeof globalThis !== 'undefined' && (globalThis as any).ENV && (globalThis as any).ENV[key]) {
            return (globalThis as any).ENV[key];
        }

        return defaultValue;
    } catch (e) {
        log.debug(`Error getting environment variable ${key}:`, e);
        return defaultValue;
    }
};

/**
 * Gets the Etherscan API key from environment variables
 *
 * @returns The Etherscan API key or undefined if not configured
 */
export const getEtherscanApiKey = (): string | undefined => {
    return getEnvironmentVariable('ETHERSCAN_API_KEY');
};
