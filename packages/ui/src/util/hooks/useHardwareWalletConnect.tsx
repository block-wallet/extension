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
    MAX_ATTEMPTS_REACHED = "MAX_ATTEMPTS_REACHED",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

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
 * @param attemptNumber Current attempt number (for retry mechanism)
 * @param maxAttempts Maximum number of connection attempts allowed
 * @returns Promise resolving to a boolean indicating connection success
 */
const executeConnect = async (
    vendor: Devices,
    ur?: URParameter,
    attemptNumber: number = 1,
    maxAttempts: number = 3
): Promise<boolean> => {
    // Track connection attempts
    if (attemptNumber > maxAttempts) {
        log.error(`Maximum connection attempts (${maxAttempts}) reached`);
        throw new Error(HardwareWalletError.MAX_ATTEMPTS_REACHED);
    }

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
                throw new Error(HardwareWalletError.CONNECTION_FAILED);
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
        log.error(`Hardware wallet connection error (attempt ${attemptNumber}/${maxAttempts}):`, e);

        // If we haven't reached max attempts, try again recursively
        if (attemptNumber < maxAttempts) {
            log.info(`Retrying connection, attempt ${attemptNumber + 1}/${maxAttempts}`);
            return executeConnect(vendor, ur, attemptNumber + 1, maxAttempts);
        }

        // Categorize error for better user feedback
        if (e.message && e.message.includes('permission')) {
            throw new Error(HardwareWalletError.PERMISSION_DENIED);
        } else if (e.message === HardwareWalletError.MAX_ATTEMPTS_REACHED) {
            throw new Error(HardwareWalletError.MAX_ATTEMPTS_REACHED);
        } else if (e.message === HardwareWalletError.QR_SUBMISSION_FAILED) {
            throw new Error(HardwareWalletError.QR_SUBMISSION_FAILED);
        }

        // Default error
        throw new Error(HardwareWalletError.UNKNOWN_ERROR);
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

            // Execute connection with retry mechanism
            return run(executeConnect(vendor, ur))
        },
        isLoading,
        isError,
        isSuccess,
        error,
        isBrowserCompatible,
    }
}

export default useHardwareWalletConnect
