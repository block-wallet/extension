/**
 * Utility for browser detection and compatibility checks
 */

// Add WebUSB interface to Navigator
declare global {
    interface Navigator {
        usb?: {
            getDevices: () => Promise<any[]>;
            requestDevice: (options: any) => Promise<any>;
        };
    }
}

export type BrowserType =
    | 'chrome'
    | 'firefox'
    | 'safari'
    | 'edge'
    | 'opera'
    | 'brave'
    | 'unknown';

export interface BrowserInfo {
    name: BrowserType;
    version: string;
    isCompatible: boolean;
}

/**
 * Detects the user's browser type and version
 * @returns Browser information including compatibility status
 */
export const detectBrowser = (): BrowserInfo => {
    const userAgent = navigator.userAgent;
    let name: BrowserType = 'unknown';
    let version = '';
    let isCompatible = false;

    // Detect browser type
    if (userAgent.indexOf('Firefox') > -1) {
        name = 'firefox';
        version = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || '';
        isCompatible = parseInt(version, 10) >= 57; // WebUSB support began in Firefox 57
    } else if (userAgent.indexOf('Edg') > -1) {
        name = 'edge';
        version = userAgent.match(/Edg\/([0-9.]+)/)?.[1] || '';
        isCompatible = parseInt(version, 10) >= 79; // Chromium-based Edge
    } else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
        name = 'opera';
        version = userAgent.match(/OPR\/([0-9.]+)/)?.[1] || '';
        isCompatible = parseInt(version, 10) >= 60;
    } else if (userAgent.indexOf('Brave') > -1) {
        name = 'brave';
        // Brave doesn't expose its version in UA, we can only detect it's Chromium-based
        version = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || '';
        isCompatible = true; // Brave is generally compatible
    } else if (userAgent.indexOf('Chrome') > -1) {
        name = 'chrome';
        version = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || '';
        isCompatible = parseInt(version, 10) >= 60; // WebUSB support began in Chrome 60
    } else if (userAgent.indexOf('Safari') > -1) {
        name = 'safari';
        version = userAgent.match(/Version\/([0-9.]+)/)?.[1] || '';
        isCompatible = false; // Safari doesn't support WebUSB for hardware wallets
    }

    return { name, version, isCompatible };
};

/**
 * Interface for hardware wallet specific compatibility checks
 */
export interface HardwareWalletCompatibility {
    isCompatible: boolean;
    errorType: ConnectionErrorType | null;
    recommendations: string[];
}

/**
 * Enum for connection error types
 */
export enum ConnectionErrorType {
    BROWSER_INCOMPATIBLE = 'BROWSER_INCOMPATIBLE',
    DEVICE_NOT_READY = 'DEVICE_NOT_READY',
    CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    USB_NOT_SUPPORTED = 'USB_NOT_SUPPORTED',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Checks if the current browser is compatible with hardware wallet connections
 * @returns Compatibility information with error type and recommendations
 */
export const checkHardwareWalletCompatibility = (): HardwareWalletCompatibility => {
    const browserInfo = detectBrowser();
    const result: HardwareWalletCompatibility = {
        isCompatible: browserInfo.isCompatible,
        errorType: null,
        recommendations: []
    };

    if (!browserInfo.isCompatible) {
        result.errorType = ConnectionErrorType.BROWSER_INCOMPATIBLE;

        switch (browserInfo.name) {
            case 'safari':
                result.recommendations = [
                    'Safari does not support hardware wallet connections.',
                    'Please use Chrome, Brave, or Firefox instead.'
                ];
                break;
            case 'firefox':
                if (parseInt(browserInfo.version, 10) < 57) {
                    result.recommendations = [
                        'Your Firefox version is too old to support hardware wallets.',
                        'Please update to Firefox 57 or newer.'
                    ];
                }
                break;
            case 'chrome':
                if (parseInt(browserInfo.version, 10) < 60) {
                    result.recommendations = [
                        'Your Chrome version is too old to support hardware wallets.',
                        'Please update to Chrome 60 or newer.'
                    ];
                }
                break;
            default:
                result.recommendations = [
                    'Your browser may not support hardware wallet connections.',
                    'For best compatibility, use Chrome, Brave, or Firefox.'
                ];
        }
    } else if (!navigator.usb) {
        // Check if WebUSB API is available
        result.isCompatible = false;
        result.errorType = ConnectionErrorType.USB_NOT_SUPPORTED;
        result.recommendations = [
            'Your browser does not support WebUSB which is required for hardware wallets.',
            'Make sure you are using an up-to-date Chromium-based browser like Chrome or Brave.'
        ];
    }

    return result;
};

/**
 * Generates a user-friendly error message for connection errors
 * @param errorType The type of connection error
 * @returns User-friendly error message
 */
export const getConnectionErrorMessage = (errorType: ConnectionErrorType): string => {
    switch (errorType) {
        case ConnectionErrorType.BROWSER_INCOMPATIBLE:
            return 'Your browser is not compatible with hardware wallet connections.';
        case ConnectionErrorType.DEVICE_NOT_READY:
            return 'Your hardware device is not ready or could not be detected.';
        case ConnectionErrorType.CONNECTION_TIMEOUT:
            return 'The connection to your hardware device timed out.';
        case ConnectionErrorType.PERMISSION_DENIED:
            return 'Permission to access your hardware device was denied.';
        case ConnectionErrorType.USB_NOT_SUPPORTED:
            return 'Your browser does not support USB connections required for hardware wallets.';
        case ConnectionErrorType.UNKNOWN_ERROR:
        default:
            return 'An unknown error occurred while connecting to your hardware device.';
    }
}; 