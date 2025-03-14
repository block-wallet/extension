import {
    connectHardwareWallet,
    completeHardwareConnection,
    hardwareQrSubmitCryptoHdKeyOrAccount,
} from "../../context/commActions"
import { Devices } from "../../context/commTypes"
import { requestConnectDevice } from "../../context/util/requestConnectDevice"
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
        case HardwareWalletError.CONNECTION_FAILED:
            if (device === Devices.LEDGER) {
                return [
                    "Make sure your Ledger is connected, unlocked, and the Ethereum app is open",
                    "Browser support for USB devices can be limited. Try using Chrome",
                    "Ensure no other applications are using your Ledger (like Ledger Live)"
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
        // First try the initial connection - this may return a special response for Ledger in MV3
        const connectionResult = await connectHardwareWallet(vendor);

        // Handle the special case for Ledger in MV3 where we need user gesture
        if (typeof connectionResult === 'object' && connectionResult.needsUserGesture) {
            log.debug('Ledger device needs user gesture for WebHID permission');

            // Handle Ledger specific connection - this requires user gesture
            const connectionOk = await requestConnectDevice();
            if (!connectionOk) {
                log.error('Ledger device connection request failed');
                const error = new Error(HardwareWalletError.CONNECTION_FAILED);
                (error as any).vendor = vendor;
                throw error;
            }

            // Now complete the connection process after user has granted permission
            return await completeHardwareConnection(vendor);
        }

        // Handle Keystone specific connection (QR-based)
        if (vendor === Devices.KEYSTONE) {
            if (!ur || !ur.cbor) {
                log.error('Invalid QR code data for Keystone connection');
                throw new Error(HardwareWalletError.QR_SUBMISSION_FAILED);
            }

            const submissionOk = await hardwareQrSubmitCryptoHdKeyOrAccount(
                ur || { type: "", cbor: "" }
            );

            if (!submissionOk) {
                log.error('QR submission for Keystone failed');
                throw new Error(HardwareWalletError.QR_SUBMISSION_FAILED);
            }

            // For Keystone we need to call connect again after QR submission
            return await connectHardwareWallet(vendor) as boolean;
        }

        // For non-Ledger and non-Keystone devices, or for Ledger in MV2
        // we can just return the result directly
        return connectionResult as boolean;
    } catch (e) {
        // Log detailed error
        log.error(`Hardware wallet connection error:`, e);

        // Categorize error for better user feedback
        if (e.message && typeof e.message === 'string') {
            if (e.message.includes('permission')) {
                const error = new Error(HardwareWalletError.PERMISSION_DENIED);
                (error as any).vendor = vendor;
                throw error;
            } else if (e.message === HardwareWalletError.QR_SUBMISSION_FAILED) {
                // Pass through QR_SUBMISSION_FAILED
                (e as any).vendor = vendor;
                throw e;
            } else if (e.message === HardwareWalletError.CONNECTION_FAILED) {
                // Pass through CONNECTION_FAILED
                const error = new Error(HardwareWalletError.CONNECTION_FAILED);
                (error as any).vendor = vendor;
                throw error;
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
    }
}

export default useHardwareWalletConnect
