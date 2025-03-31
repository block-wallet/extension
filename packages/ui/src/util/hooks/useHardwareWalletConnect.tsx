import {
    connectHardwareWallet,
    completeHardwareConnection,
    hardwareQrSubmitCryptoHdKeyOrAccount,
} from "../../context/commActions"
import { Devices, HardwareWalletConnectionResult } from "../../context/commTypes"
import { requestLedgerDevicePermission } from "../../context/util/requestConnectDevice"
import useAsyncInvoke from "./useAsyncInvoke"
import log from "loglevel"
import useClearStickyStorage from "../../context/hooks/useClearStickyStorage"
import { URParameter } from "../../components/qr/QRReader"

/**
 * Enum for categorizing specific hardware wallet connection errors
 */
export enum HardwareWalletError {
    BROWSER_INCOMPATIBLE = "BROWSER_INCOMPATIBLE",
    CONNECTION_FAILED = "CONNECTION_FAILED",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    UNSUPPORTED_BROWSER = "UNSUPPORTED_BROWSER",
    QR_SUBMISSION_FAILED = "QR_SUBMISSION_FAILED",
    APP_NOT_OPEN = "APP_NOT_OPEN",
    DEVICE_LOCKED = "DEVICE_LOCKED",
    DEVICE_BUSY = "DEVICE_BUSY",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

/**
 * Maps hardware wallet errors to user-friendly messages
 */
export const getHardwareWalletErrorMessage = (error: HardwareWalletError): string => {
    switch (error) {
        case HardwareWalletError.BROWSER_INCOMPATIBLE:
            return "Your browser is not compatible with hardware wallets";
        case HardwareWalletError.CONNECTION_FAILED:
            return "Failed to connect to your hardware wallet";
        case HardwareWalletError.PERMISSION_DENIED:
            return "Permission to access hardware wallet was denied";
        case HardwareWalletError.UNSUPPORTED_BROWSER:
            return "Your browser doesn't support hardware wallet connections";
        case HardwareWalletError.QR_SUBMISSION_FAILED:
            return "Failed to process QR code data";
        case HardwareWalletError.APP_NOT_OPEN:
            return "Ethereum app not open on device";
        case HardwareWalletError.DEVICE_LOCKED:
            return "Hardware wallet is locked";
        case HardwareWalletError.DEVICE_BUSY:
            return "Hardware wallet is currently busy";
        case HardwareWalletError.UNKNOWN_ERROR:
        default:
            return "An unknown error occurred during hardware wallet connection";
    }
};

/**
 * Returns recommendation steps based on error type
 */
export const getHardwareWalletErrorRecommendations = (error: HardwareWalletError, device: Devices): string[] => {
    const baseRecommendations = [
        "Make sure your device is connected properly and unlocked",
        "Ensure the appropriate app is open on your device",
        "Try disconnecting and reconnecting your device"
    ];

    switch (error) {
        case HardwareWalletError.PERMISSION_DENIED:
            return [
                "You denied permission to access the hardware wallet",
                "Please try again and allow access when prompted"
            ];
        case HardwareWalletError.APP_NOT_OPEN:
            if (device === Devices.LEDGER) {
                return [
                    "Make sure the Ethereum app is open on your Ledger",
                    "Navigate to the Ethereum app on your device and select it",
                    "If you don't have the Ethereum app installed, install it through Ledger Live"
                ];
            }
            return [
                "Make sure the appropriate app is open on your device",
                "Check device screen for any pending confirmations"
            ];
        case HardwareWalletError.DEVICE_LOCKED:
            return [
                "Unlock your device by entering your PIN",
                "Make sure the device is awake and not in sleep mode"
            ];
        case HardwareWalletError.DEVICE_BUSY:
            return [
                "Your device is being used by another application",
                "Close other applications that might be using your device (like Ledger Live)",
                "Disconnect and reconnect your device"
            ];
        case HardwareWalletError.CONNECTION_FAILED:
            if (device === Devices.LEDGER) {
                return [
                    "Make sure your Ledger is connected, unlocked, and the Ethereum app is open",
                    "Browser support for USB devices can be limited. Try using Chrome",
                    "Ensure no other applications are using your Ledger (like Ledger Live)",
                    "Try using a different USB cable or port"
                ];
            }
            return baseRecommendations;
        default:
            return baseRecommendations;
    }
};

/**
 * Checks if the browser environment is compatible with our hardware wallet connection approach
 * @returns {boolean} True if the environment is compatible
 */
const isBrowserCompatible = (): boolean => {
    // Extensions cannot directly use WebHID/WebUSB APIs
    // But we'll return true and handle connections through our offscreen page approach
    return true;
}

/**
 * Analyzes error messages to determine specific Ledger error types
 * @param error The error object or message
 * @returns A specific HardwareWalletError type
 */
const determineLedgerErrorType = (error: Error | string): HardwareWalletError => {
    const errorMsg = typeof error === 'string' ? error : (error.message || '');

    if (errorMsg.includes('CONDITIONS_OF_USE_NOT_SATISFIED') ||
        errorMsg.includes('locked') ||
        errorMsg.includes('Ledger device is locked')) {
        return HardwareWalletError.DEVICE_LOCKED;
    }

    if (errorMsg.includes('Timeout') ||
        errorMsg.includes('timed out') ||
        errorMsg.includes('Make sure your Ledger is unlocked with the Ethereum app open')) {
        return HardwareWalletError.APP_NOT_OPEN;
    }

    if (errorMsg.includes('busy') ||
        errorMsg.includes('in use') ||
        errorMsg.includes('Cannot access Ledger device') ||
        errorMsg.includes('close any other applications')) {
        return HardwareWalletError.DEVICE_BUSY;
    }

    if (errorMsg.includes('permission') ||
        errorMsg.includes('denied') ||
        errorMsg.includes('UNKNOWN_ERROR')) {
        return HardwareWalletError.PERMISSION_DENIED;
    }

    return HardwareWalletError.CONNECTION_FAILED;
}

/**
 * Executes the hardware wallet connection process with enhanced error handling
 * @param vendor The hardware wallet vendor (e.g., Ledger, Keystone)
 * @param ur Optional UR parameter for QR-based connections
 * @returns Promise resolving to a boolean indicating connection success
 */
const executeConnect = async (
    vendor: Devices,
    ur?: URParameter,
): Promise<boolean> => {
    try {
        // For Ledger, request permission FIRST within the user gesture
        if (vendor === Devices.LEDGER) {
            log.debug('Requesting Ledger device permission first...');
            let permissionGranted = false;
            try {
                permissionGranted = await requestLedgerDevicePermission();
            } catch (permError) {
                log.error('Error during Ledger permission request:', permError);
                // Map specific errors if needed, otherwise throw a generic permission error
                if (permError.message.includes('SecurityError')) {
                    throw new Error(HardwareWalletError.PERMISSION_DENIED);
                } else {
                    throw new Error(HardwareWalletError.CONNECTION_FAILED);
                }
            }

            if (!permissionGranted) {
                log.warn('Ledger permission not granted by user.');
                // Return false to indicate cancellation/denial without throwing an error
                return false;
            }
            log.debug('Ledger permission granted. Proceeding with background connection...');
        }

        // Now, contact the background script to connect/initialize the keyring
        // The background script should now assume permission is granted for Ledger
        const connectionResult: HardwareWalletConnectionResult = await connectHardwareWallet(vendor);

        // Check the result from the background script
        if (typeof connectionResult === 'boolean') {
            if (!connectionResult) {
                log.error(`Background connection failed for ${vendor}`);
                // Determine specific error if possible (e.g., check session storage for errors)
                throw new Error(HardwareWalletError.CONNECTION_FAILED);
            }
            // Simple boolean true means success for non-Ledger or cases where background handled everything
            return true;
        } else if (typeof connectionResult === 'object') {
            // Handle object responses (e.g., needsEthereumApp for Ledger)
            if (connectionResult.needsEthereumApp) {
                log.warn('Ledger connected but Ethereum app needs to be opened.');
                const appError = new Error(HardwareWalletError.APP_NOT_OPEN);
                (appError as any).vendor = vendor;
                throw appError;
            }
            // Handle the case where background connected but needs UI interaction for keyring
            if (connectionResult.needsUserGesture) {
                log.debug('Background Ledger connection successful, UI interaction needed for keyring.');
                // Return true as the device connection part succeeded.
                // The UI flow will proceed, and subsequent actions (like getting accounts)
                // will handle the necessary UI context.
                return true;
            }
            // Potentially handle other object responses if added later
        }

        // If we reach here, something unexpected happened with the connection result
        log.error(`Unexpected connection result from background for ${vendor}:`, connectionResult);
        throw new Error(HardwareWalletError.UNKNOWN_ERROR);

    } catch (e) {
        // Log detailed error
        log.error(`Hardware wallet connection error:`, e);

        // Categorize error for better user feedback
        if (e.message && typeof e.message === 'string') {
            // If the error is already one of our custom errors, pass it through
            if (Object.values(HardwareWalletError).includes(e.message as HardwareWalletError)) {
                const error = new Error(e.message);
                (error as any).vendor = vendor;
                (error as any).originalError = e;
                throw error;
            }

            // For Ledger devices, do more detailed error analysis
            if (vendor === Devices.LEDGER) {
                const specificErrorType = determineLedgerErrorType(e);
                const error = new Error(specificErrorType);
                (error as any).vendor = vendor;
                (error as any).originalError = e;
                throw error;
            } else if (e.message.includes('permission')) {
                const error = new Error(HardwareWalletError.PERMISSION_DENIED);
                (error as any).vendor = vendor;
                throw error;
            } else if (e.message === HardwareWalletError.QR_SUBMISSION_FAILED) {
                // Pass through QR_SUBMISSION_FAILED
                (e as any).vendor = vendor;
                throw e;
            } else if (e.message === HardwareWalletError.CONNECTION_FAILED) {
                // Pass through CONNECTION_FAILED
                (e as any).vendor = vendor;
                throw e;
            }
        }

        // Default error with additional context
        const error = new Error(HardwareWalletError.UNKNOWN_ERROR);
        (error as any).vendor = vendor;
        (error as any).originalError = e;
        throw error;
    }
};

/**
 * Hook for managing hardware wallet connections with enhanced error handling
 * @param isReconnecting Whether this is a reconnection attempt
 * @returns Object containing connection function and status flags
 */
const useHardwareWalletConnect = (isReconnecting = false) => {
    const { run, isLoading, isError, isSuccess, error } = useAsyncInvoke()
    const { clear: clearStickyStorage } = useClearStickyStorage()

    return {
        connect: async (vendor: Devices, ur?: URParameter) => {
            // Get rid of the sticky storage data
            // as the user should see the home page after the connection
            // when opening the extension again.
            if (!isReconnecting) {
                clearStickyStorage()
            }

            // Execute connection (without automatic retries)
            return run(executeConnect(vendor, ur))
        },
        isLoading,
        isError,
        isSuccess,
        error,
        isBrowserCompatible,
        getHardwareWalletErrorMessage,
        getHardwareWalletErrorRecommendations,
        determineLedgerErrorType
    }
}

export default useHardwareWalletConnect
