import { useCallback, useEffect, useMemo, useReducer, useState, useRef } from "react"
import { useHistory, useParams } from "react-router-dom"
import HardwareWalletSetupLayout from "./SetupLayout"
import log from "loglevel"
import {
    connectHardwareWallet,
    completeHardwareConnection,
    getHardwareWalletAccounts,
    setHardwareWalletHDPath,
    importHardwareWalletAccounts,
    getHardwareWalletHDPath,
    selectAccount,
} from "../../context/commActions"
import { useBlankState } from "../../context/background/backgroundHooks"
import { BIP44_PATH, Devices, HDPaths } from "../../context/commTypes"
import { ledgerBridge } from "../../utils/ledgerBridge"

import LoadingOverlay from "../../components/loading/LoadingOverlay"
import {
    AccountInfo,
    DeviceAccountInfo,
} from "@block-wallet/background/controllers/AccountTrackerController"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import Spinner from "../../components/spinner/Spinner"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import Select from "../../components/input/Select"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import { BigNumber } from "@ethersproject/bignumber"
import { AccountsPageAdvancedSettings } from "../../components/hardwareWallet/AdvancedSettings"
import { HardwareWalletAccount } from "../../components/hardwareWallet/HardwareWalletAccount"

// Assets & icons
import { mergeReducer } from "../../util/reducerUtils"
import useAsyncInvoke, { Status } from "../../util/hooks/useAsyncInvoke"

// Define HARDWARE_ROUTE constant 
const HARDWARE_ROUTE = "/hardware-wallet";

// Add this constant near the top of the file, with other constants
const MAX_ACCOUNTS = 50; // Maximum number of accounts that can be displayed from hardware wallet

// Helper function to replace classnames as it's causing linter errors
const combineClasses = (...classes: string[]): string => {
    return classes.filter(Boolean).join(' ');
}

// Simple icon component implementations to avoid import issues
const WarningIcon = (props: any) => (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 21.41H5.93999C2.46999 21.41 1.01999 18.93 2.69999 15.9L5.81999 10.28L8.75999 5.00003C10.54 1.79003 13.46 1.79003 15.24 5.00003L18.18 10.29L21.3 15.91C22.98 18.94 21.52 21.42 18.06 21.42H12V21.41Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11.995 17H12.005" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CheckIcon = (props: any) => (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.5 12.75L10.5 18.75L19.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const UsbIcon = (props: any) => (
    <svg {...props} width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.99951 19.166V1.66602" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" />
        <path d="M5.49951 4.16602L7.99951 1.66602L10.4995 4.16602" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="square" />
        <path d="M12.9995 11.666V14.166L7.99951 17.4993" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" />
        <path d="M3 10V13.3333L8 16.6667" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" />
        <path d="M14.6663 8.33203H11.333V11.6654H14.6663V8.33203Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="square" />
        <path d="M2.99967 9.99935C3.92015 9.99935 4.66634 9.25316 4.66634 8.33268C4.66634 7.41221 3.92015 6.66602 2.99967 6.66602C2.0792 6.66602 1.33301 7.41221 1.33301 8.33268C1.33301 9.25316 2.0792 9.99935 2.99967 9.99935Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="square" />
    </svg>
);

const LoadingSpinner = (props: any) => (
    <svg {...props} className={props.className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// Simple Button component to avoid import issues
const Button = ({ children, className, onClick, disabled, size, type }: any) => (
    <button
        type={type || "button"}
        className={className || "px-4 py-2 bg-blue-500 text-white rounded"}
        onClick={onClick}
        disabled={disabled}
    >
        {children}
    </button>
);

// Simple pagination controls component
const PaginationControls = ({ currentPage, pages, onChangePage, disabled, stickyFirstPage, showArrows, className }: any) => (
    <div className={className || "flex items-center space-x-2"}>
        {showArrows !== false && (
            <button disabled={disabled || currentPage === 1} onClick={() => onChangePage(currentPage - 1)}>
                &lt;
            </button>
        )}

        {Array.from({ length: pages }, (_, i) => i + 1).map(page => (
            <button
                key={page}
                onClick={() => onChangePage(page)}
                disabled={disabled || (page === currentPage)}
                className={page === currentPage ? "font-bold" : ""}
            >
                {page}
            </button>
        ))}

        {showArrows !== false && (
            <button disabled={disabled || currentPage === pages} onClick={() => onChangePage(currentPage + 1)}>
                &gt;
            </button>
        )}
    </div>
);

// Define any necessary CSS classes
const Classes = {
    button: "bg-blue-600 text-white font-medium rounded-md",
    liteButton: "bg-gray-200 text-gray-800 font-medium rounded-md"
};

interface State {
    gettingAccounts: boolean
    selectedAccounts: DeviceAccountInfo[]
    deviceAccounts: DeviceAccountInfo[]

    pageSize: number
    currentPage: number

    // HW state
    deviceNotReady: boolean
    reconnecting: boolean
    ethAppStatus: 'unknown' | 'open' | 'closed'
    errorMessage: string
}

const initialState: State = {
    gettingAccounts: true,
    selectedAccounts: [],
    deviceAccounts: [],
    pageSize: 5,
    currentPage: 1,
    deviceNotReady: false,
    reconnecting: false,
    ethAppStatus: 'unknown',
    errorMessage: ''
}

async function ensureKeyringInitialized(vendor: Devices): Promise<boolean> {
    if (vendor !== Devices.LEDGER) return true; // Only needed for Ledger

    log.debug("Ensuring Ledger keyring is properly initialized");
    console.log("[LEDGER] Ensuring Ledger keyring is properly initialized");

    // First check if we've explicitly stored a connection status in storage
    if (chrome.storage?.session) {
        try {
            const connectionStatus = await chrome.storage.session.get('ledger_connection_status');
            console.log("[LEDGER] Checking session storage connection status:", connectionStatus);
            if (connectionStatus.ledger_connection_status?.connected &&
                Date.now() - connectionStatus.ledger_connection_status.timestamp < 60000) { // If connected in last minute

                log.debug("Found recent Ledger connection status in session storage");
                console.log("[LEDGER] Found recent valid connection status in session storage");
                // Store vendor in session storage for better restoration
                sessionStorage.setItem('hw_vendor', vendor);
                return true;
            }
        } catch (e) {
            log.error("Failed to check Ledger connection status:", e);
            console.error("[LEDGER] Failed to check connection status:", e);
        }
    }

    // Try multiple initialization approaches with retry logic
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            attempts++;
            log.debug(`Initialization attempt ${attempts}/${maxAttempts}`);
            console.log(`[LEDGER] Initialization attempt ${attempts}/${maxAttempts}`);

            // Try to initialize the keyring in the UI context where DOM is available
            const result = await connectHardwareWallet(vendor);
            console.log(`[LEDGER] Initialization attempt ${attempts} result:`, result);

            // If successful or needs user gesture, consider it a success
            if (result === true || (typeof result === 'object' && result.needsUserGesture)) {
                // Store connection status in session storage
                if (chrome.storage?.session) {
                    try {
                        await chrome.storage.session.set({
                            'ledger_connection_status': {
                                connected: true,
                                timestamp: Date.now(),
                                needsUserGesture: typeof result === 'object' && result.needsUserGesture
                            }
                        });
                        console.log("[LEDGER] Stored connection status in session storage");
                    } catch (storageError) {
                        log.error("Failed to store connection status:", storageError);
                        console.error("[LEDGER] Failed to store connection status:", storageError);
                    }
                }

                // Store vendor in session storage for better restoration
                sessionStorage.setItem('hw_vendor', vendor);

                log.debug("Ledger keyring initialization successful");
                console.log("[LEDGER] Keyring initialization successful");
                return true;
            }

            // If we're here, connection wasn't successful
            log.warn(`Ledger connection attempt ${attempts} did not return success`);
            console.warn(`[LEDGER] Connection attempt ${attempts} did not return success`);

            // Wait before retrying
            if (attempts < maxAttempts) {
                console.log(`[LEDGER] Waiting before retry attempt ${attempts + 1}...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (e) {
            log.error(`Failed to initialize Ledger keyring (attempt ${attempts}/${maxAttempts}):`, e);
            console.error(`[LEDGER] Failed to initialize keyring (attempt ${attempts}/${maxAttempts}):`, e);

            if (attempts >= maxAttempts) {
                // Last attempt - check if we have a connection status that indicates success
                try {
                    if (chrome.storage?.session) {
                        const result = await chrome.storage.session.get('ledger_connection_status');
                        console.log("[LEDGER] Checking connection status after failed attempts:", result);
                        if (result.ledger_connection_status && result.ledger_connection_status.connected) {
                            // We have a connection status, so we can proceed even without a proper keyring
                            log.debug("Proceeding with minimal keyring connection based on status");
                            console.log("[LEDGER] Proceeding with minimal keyring connection based on status");
                            return true;
                        }
                    }
                } catch (storageError) {
                    log.error("Failed to check connection status:", storageError);
                    console.error("[LEDGER] Failed to check connection status:", storageError);
                }

                return false;
            }

            // Wait before retrying
            console.log(`[LEDGER] Waiting before retry after error in attempt ${attempts}...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return false;
}

// Add this new function before fetchAccountsWithRetry
const forceVerifyEthereumApp = async (): Promise<boolean> => {
    try {
        // Send a direct message to force verification bypassing cache
        const response = await chrome.runtime.sendMessage({
            type: 'HW_VERIFY_ETH_APP',
            device: 'LEDGER',
            transportType: 'webhid',
            bypassCache: true, // Add flag to bypass cache
            requestId: Date.now().toString() // Add unique ID to track this request
        }).catch(error => {
            console.error('[LEDGER] Error in verification message send:', error);
            // If message channel closed error, return null to handle gracefully
            if (error.message && error.message.includes('message channel closed')) {
                return null;
            }
            throw error;
        });

        // Handle case where message channel closed or response is null
        if (!response) {
            log.debug('Ethereum app verification failed - no response received');
            console.log('[LEDGER] Ethereum app verification failed - no response received');

            // Check session storage as fallback
            if (chrome.storage?.session) {
                const status = await chrome.storage.session.get('ledger_eth_app_status');
                if (status.ledger_eth_app_status && Date.now() - status.ledger_eth_app_status.timestamp < 30000) {
                    return status.ledger_eth_app_status.open === true;
                }
            }

            return false;
        }

        if (response && response.success && response.appOpen) {
            // Update the status in session storage
            if (chrome.storage?.session) {
                await chrome.storage.session.set({
                    'ledger_eth_app_status': {
                        open: true,
                        timestamp: Date.now()
                    }
                });
            }
            return true;
        }
        return false;
    } catch (error) {
        log.error('Error in forceVerifyEthereumApp:', error);
        console.error('[LEDGER] Error in forceVerifyEthereumApp:', error);

        // Check if there's an issue with the message channel
        if (error.message && (
            error.message.includes('message channel closed') ||
            error.message.includes('asynchronous response')
        )) {
            // Check session storage as fallback
            if (chrome.storage?.session) {
                try {
                    const status = await chrome.storage.session.get('ledger_eth_app_status');
                    if (status.ledger_eth_app_status && Date.now() - status.ledger_eth_app_status.timestamp < 30000) {
                        return status.ledger_eth_app_status.open === true;
                    }
                } catch (e) {
                    console.error('[LEDGER] Error checking session storage:', e);
                }
            }
        }

        return false;
    }
};

/**
 * Fetches hardware wallet accounts with retry logic
 * @param vendor The hardware wallet vendor
 * @param retryCount Current retry count
 * @param pageIndex Page index for pagination
 * @param pageSize Number of accounts per page
 * @returns Array of device accounts
 */
async function fetchAccountsWithRetry(vendor: Devices, retryCount = 1, pageIndex = 0, pageSize = 5): Promise<DeviceAccountInfo[]> {
    log.debug(`Fetching accounts attempt ${retryCount} for ${vendor}`);

    try {
        // First check if we're dealing with Ledger and need to verify Ethereum app
        if (vendor === Devices.LEDGER) {
            try {
                // Attempt to check connection status from session storage
                if (chrome.storage?.session) {
                    const ethAppStatus = await chrome.storage.session.get('ledger_eth_app_status');
                    if (ethAppStatus.ledger_eth_app_status) {
                        const status = ethAppStatus.ledger_eth_app_status;
                        // Only use status if it's recent (within last 2 minutes)
                        if (Date.now() - status.timestamp < 120000) {
                            if (!status.open) {
                                log.debug("Ethereum app not open according to recent status check");
                                console.log("[LEDGER] Ethereum app not open according to recent status check");

                                // Force verify before throwing error
                                const isNowOpen = await forceVerifyEthereumApp();
                                if (isNowOpen) {
                                    log.debug("Ethereum app is now open after direct verification");
                                    console.log("[LEDGER] Ethereum app is now open after direct verification");
                                } else {
                                    throw new Error('LEDGER_ETHEREUM_APP_CLOSED');
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // Handle message channel closed errors specifically
                if (e.message && e.message.includes('message channel closed')) {
                    console.error('[LEDGER] Message channel closed error during app verification:', e);

                    // Try one more time with a delay before giving up
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const isAppOpen = await forceVerifyEthereumApp().catch(err => {
                        console.error('[LEDGER] Retry verification failed:', err);
                        return false;
                    });

                    if (!isAppOpen) {
                        throw new Error('LEDGER_ETHEREUM_APP_CLOSED');
                    }
                } else if (e.message === 'LEDGER_ETHEREUM_APP_CLOSED') {
                    throw e;
                }
                // Ignore other errors here, we'll try to get accounts anyway
            }
        }

        // Now try to fetch accounts
        const accounts = await getHardwareWalletAccounts(vendor, pageIndex, pageSize);

        if (accounts && accounts.length > 0) {
            return accounts;
        } else if (retryCount < 3) {
            // If we get an empty result but haven't exceeded retries, wait and try again
            log.debug(`No accounts returned, retrying (${retryCount}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchAccountsWithRetry(vendor, retryCount + 1, pageIndex, pageSize);
        } else {
            // If we've exhausted retries and still have no accounts, throw an error
            log.error(`No accounts returned after ${retryCount} attempts`);
            throw new Error('No accounts found. Please ensure the Ethereum app is open on your device.');
        }
    } catch (error) {
        log.error(`Error fetching accounts (attempt ${retryCount}):`, error);

        if (error.message === 'LEDGER_ETHEREUM_APP_CLOSED') {
            // Try to force verify Ethereum app before giving up
            const isNowOpen = await forceVerifyEthereumApp();
            if (isNowOpen) {
                log.debug("Ethereum app is now open after direct verification, retrying...");
                console.log("[LEDGER] Ethereum app is now open after direct verification, retrying...");
                return fetchAccountsWithRetry(vendor, retryCount, pageIndex, pageSize);
            }
            throw error;
        }

        // Special handling for message channel closed errors
        if (error.message && error.message.includes('message channel closed')) {
            console.error('[LEDGER] Message channel closed error during account fetch:', error);

            // If this is the first or second attempt, try again with a longer delay
            if (retryCount < 3) {
                console.log(`[LEDGER] Retrying after message channel error (${retryCount}/3)...`);
                await new Promise(resolve => setTimeout(resolve, 1500)); // Longer delay for channel issues
                return fetchAccountsWithRetry(vendor, retryCount + 1, pageIndex, pageSize);
            }
        }

        // If we haven't exceeded retries, wait and try again
        if (retryCount < 3) {
            log.debug(`Error fetching accounts, retrying (${retryCount}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchAccountsWithRetry(vendor, retryCount + 1, pageIndex, pageSize);
        }

        // If we've exhausted retries, rethrow the error
        throw error;
    }
}

const HardwareWalletAccountsPage = () => {
    const history = useOnMountHistory()!
    const [enabledPagination, setEnabledPagination] = useState(true)
    const params = useParams<{ device: string }>();

    const getVendorFromUrlOrHistory = (): Devices => {
        try {
            // First check if vendor is in history state
            if (history.location.state && history.location.state.vendor) {
                const vendor = history.location.state.vendor;
                log.debug(`Found vendor in history state: ${vendor}`);
                console.log(`[LEDGER] Found vendor in history state: ${vendor}`);
                return vendor as Devices;
            }

            // Then check if it's in sessionStorage (for page refreshes)
            const storedVendor = sessionStorage.getItem('hw_vendor');
            if (storedVendor) {
                console.log(`[LEDGER] Found vendor in session storage: ${storedVendor}`);
                return storedVendor as Devices;
            }

            // Finally, check URL params - use params from component scope
            const device = params.device;

            if (device) {
                console.log(`[LEDGER] Using device from URL params: ${device}`);
                return device.toUpperCase() as Devices;
            }

            // Default to LEDGER if all else fails
            console.log(`[LEDGER] No vendor found, defaulting to LEDGER`);
            return Devices.LEDGER;
        } catch (e) {
            // If any error occurs, default to LEDGER
            log.error("Error getting vendor, defaulting to LEDGER:", e);
            console.error("[LEDGER] Error getting vendor, defaulting to LEDGER:", e);
            return Devices.LEDGER;
        }
    }

    const vendor = getVendorFromUrlOrHistory();

    // If vendor wasn't in history state, update it for future navigation
    useEffect(() => {
        // Update history state
        if (!history.location.state || !history.location.state.vendor) {
            history.replace({
                ...history.location,
                state: { ...(history.location.state || {}), vendor }
            });
        }

        // Also store in session storage for redundancy
        try {
            if (chrome.storage?.session) {
                sessionStorage.setItem('hw_vendor', vendor);
            }
        } catch (e) {
            log.error('Failed to store vendor in session storage:', e);
        }

        // Add vendor as URL parameter if not already present
        if (!history.location.search.includes('vendor=')) {
            const separator = history.location.search ? '&' : '?';
            const newSearch = `${history.location.search}${separator}vendor=${vendor.toLowerCase()}`;
            history.replace({
                ...history.location,
                search: newSearch
            });
        }
    }, [history, vendor]);

    const isKeystoneConnected = history.location.state?.isKeystoneConnected

    // Added error state to track and display specific errors
    const [fetchError, setFetchError] = useState<string | null>(null);
    // Add state to track alternative path attempts
    const [isSearchingAlternativePaths, setIsSearchingAlternativePaths] = useState(false);
    const [hdPathsChecked, setHdPathsChecked] = useState<string[]>([]);
    const [needsUserInteraction, setNeedsUserInteraction] = useState<boolean>(false);

    const {
        run,
        data: hdPath,
        isLoading: isLoadingHDPath,
        setData: setHdPath,
    } = useAsyncInvoke<string>({
        status: Status.PENDING,
    })
    const { run: runImportAccounts, isLoading: isImportingAccounts } =
        useAsyncInvoke()
    const { accounts: existingAccounts } = useBlankState()!

    const existingAddresses = useMemo(() => {
        const accounts = Object.values(existingAccounts) as AccountInfo[]

        return accounts.map(({ address }) => address)

        // Disabled to prevent unwanted re-renderings
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const [state, setState] = useReducer(
        mergeReducer<State, Partial<State>>(),
        initialState
    )

    const allPathsAttempted = useRef(false);

    // Attempt to automatically connect to the Ledger device without user interaction
    const attemptAutomaticLedgerConnection = async (): Promise<boolean> => {
        log.debug("Attempting automatic Ledger connection");
        console.log("[LEDGER] Attempting automatic connection");

        if (vendor !== Devices.LEDGER) {
            log.debug("Not a Ledger device, skipping automatic connection");
            return false;
        }

        setState({
            gettingAccounts: true,
            deviceAccounts: [],
            errorMessage: ''
        });

        try {
            // First check if we have a connection already
            const isConnected = await ledgerBridge.checkWebHIDStatus();
            if (isConnected) {
                log.debug("Ledger already connected via WebHID");
                console.log("[LEDGER] Device already connected via WebHID");

                // Try to get accounts immediately
                return true;
            }

            // Check if we have paired devices
            if (navigator.hid) {
                try {
                    const pairedDevices = await navigator.hid.getDevices();
                    const ledgerDevices = pairedDevices.filter(
                        device => device.vendorId === 0x2c97 || device.vendorId === 0x2581
                    );

                    if (ledgerDevices.length > 0) {
                        log.debug(`Found ${ledgerDevices.length} already paired Ledger devices`);
                        console.log(`[LEDGER] Found ${ledgerDevices.length} already paired devices`);

                        // Try to open the device
                        try {
                            const device = ledgerDevices[0];
                            if (!device.opened) {
                                await device.open();
                                log.debug("Successfully opened paired Ledger device silently");
                                console.log("[LEDGER] Successfully opened paired device silently");
                            }

                            // Store connection status
                            if (chrome.storage?.session) {
                                await chrome.storage.session.set({
                                    'ledger_connection_status': {
                                        connected: true,
                                        timestamp: Date.now(),
                                        autoConnected: true
                                    }
                                });
                            }

                            // Initialize the connection
                            const result = await connectHardwareWallet(vendor);
                            log.debug("Automatic hardware wallet connection result:", result);
                            console.log("[LEDGER] Automatic connection result:", result);

                            return true;
                        } catch (openError) {
                            log.warn("Failed to automatically open paired device:", openError);
                            console.warn("[LEDGER] Failed to automatically open paired device:", openError);
                        }
                    } else {
                        log.debug("No paired Ledger devices found");
                        console.log("[LEDGER] No paired devices found");
                    }
                } catch (e) {
                    log.warn("Error checking for paired devices:", e);
                    console.warn("[LEDGER] Error checking for paired devices:", e);
                }
            } else {
                log.debug("WebHID API not available");
                console.log("[LEDGER] WebHID API not available");
            }

            // No automatic connection possible
            return false;
        } catch (e) {
            log.warn("Error in automatic Ledger connection:", e);
            console.warn("[LEDGER] Error in automatic connection:", e);
            return false;
        } finally {
            // Only update state if we're still mounted
            setState({ gettingAccounts: false });
        }
    };

    useEffect(() => {
        // Check for direct navigation state from service worker
        const checkNavigationState = async () => {
            try {
                if (!vendor) {
                    log.error("No vendor found for hardware wallet");
                    console.error("[LEDGER] No vendor found for hardware wallet");
                    setState({
                        gettingAccounts: false,
                        deviceNotReady: true
                    });
                    return false;
                }

                console.log(`[LEDGER] Checking navigation state for vendor: ${vendor}`);

                // Check for explicit stored device info
                let hasDeviceInfo = false;

                if (vendor === Devices.LEDGER && chrome.storage?.session) {
                    try {
                        const result = await chrome.storage.session.get('ledger_connection_status');
                        console.log("[LEDGER] Checking connection status:", result);
                        if (result.ledger_connection_status?.connected) {
                            hasDeviceInfo = true;
                            console.log("[LEDGER] Found valid connection status");
                        }
                    } catch (e) {
                        console.warn("[LEDGER] Error checking connection status:", e);
                    }
                }

                // If no explicit device info, ensure keyring is initialized
                if (!hasDeviceInfo) {
                    const initialized = await ensureKeyringInitialized(vendor);
                    console.log(`[LEDGER] Keyring initialization result: ${initialized}`);
                    if (!initialized) {
                        console.error("[LEDGER] Failed to initialize keyring");

                        // For Ledger, try automatic connection before showing error
                        if (vendor === Devices.LEDGER) {
                            const autoConnected = await attemptAutomaticLedgerConnection();
                            if (autoConnected) {
                                console.log("[LEDGER] Automatic connection successful");
                                // Get accounts without showing device not ready dialog
                                getAccounts();
                                return true;
                            }
                            console.log("[LEDGER] Automatic connection failed, will need manual connection");
                        }

                        setState({
                            gettingAccounts: false,
                            deviceNotReady: true
                        });
                        return false;
                    }
                }

                console.log("[LEDGER] Navigation state check passed");
                return true;
            } catch (e) {
                log.error("Error in checkNavigationState:", e);
                console.error("[LEDGER] Error in checkNavigationState:", e);

                // For Ledger, try automatic connection before showing error
                if (vendor === Devices.LEDGER) {
                    const autoConnected = await attemptAutomaticLedgerConnection();
                    if (autoConnected) {
                        console.log("[LEDGER] Automatic connection successful after error");
                        // Get accounts without showing device not ready dialog
                        getAccounts();
                        return true;
                    }
                }

                setState({
                    gettingAccounts: false,
                    deviceNotReady: true
                });
                return false;
            }
        };

        checkNavigationState();
        run(getHardwareWalletHDPath(vendor));

        // Check for pending accounts stored during service worker context
        const checkForPendingAccounts = async () => {
            if (vendor === Devices.LEDGER && chrome.storage?.session) {
                try {
                    console.log("[LEDGER] Checking for pending accounts in session storage");
                    const result = await chrome.storage.session.get(['ledger_pending_accounts', 'ledger_needs_user_interaction']);

                    if (result.ledger_pending_accounts && Array.isArray(result.ledger_pending_accounts) && result.ledger_pending_accounts.length > 0) {
                        console.log(`[LEDGER] Found ${result.ledger_pending_accounts.length} pending accounts:`, result.ledger_pending_accounts);

                        // Convert pending addresses to DeviceAccountInfo format
                        const pendingAddresses = result.ledger_pending_accounts;
                        const deviceAccounts: DeviceAccountInfo[] = pendingAddresses.map((address: string, i: number) => {
                            // If we have account indexes from the original request, use those
                            const indexes = result.ledger_needs_user_interaction?.accountIndexes || [];
                            const index = indexes[i] !== undefined ? indexes[i] : i;

                            return {
                                address,
                                index,
                                name: `Ledger ${index + 1}`,
                                balance: "0" // Balance will be fetched separately
                            };
                        });

                        if (deviceAccounts.length > 0) {
                            setNeedsUserInteraction(true);
                            setState({
                                deviceAccounts,
                                gettingAccounts: false,
                                ethAppStatus: 'open'
                            });

                            // Pre-select these accounts since they're pending import
                            setState({ selectedAccounts: deviceAccounts });

                            console.log("[LEDGER] Pre-selected pending accounts for import");
                            return true;
                        }
                    }

                    if (result.ledger_needs_user_interaction) {
                        console.log("[LEDGER] User interaction needed:", result.ledger_needs_user_interaction);
                        setNeedsUserInteraction(true);
                    }
                } catch (e) {
                    console.warn("[LEDGER] Error checking pending accounts:", e);
                }
            }
            return false;
        };

        checkForPendingAccounts();
    }, [vendor, run]);

    const [accountsBalances, setAccountBalances] = useState<{
        [address in string]: BigNumber
    }>({})
    const addAccountBalance = (address: string, balance: BigNumber) => {
        accountsBalances[address] = BigNumber.from(balance)
        setAccountBalances(accountsBalances)
    }

    //Will check if this Keystone can Only synchronize 10 accounts (Ledger Live)
    const checkKeystoneAccounts = useCallback(async () => {
        setState({ gettingAccounts: true })
        try {
            await getHardwareWalletAccounts(vendor, 2, 10)
        } catch (e) {
            setEnabledPagination(false)
        }
    }, [vendor])

    // Function to try alternative HD paths for Ledger
    const tryAlternativeHDPaths = async () => {
        try {
            if (allPathsAttempted.current) {
                console.log("[LEDGER] All HD paths already attempted");
                return;
            }

            // Use the existing setState pattern to update state
            setState({
                gettingAccounts: true,
            });

            log.debug("Trying alternative HD paths");
            console.log(`[LEDGER] Trying alternative HD paths for vendor: ${vendor}`);

            // Verify that the HD path is not already Ledger Live
            const currentHdPath = await getHardwareWalletHDPath(vendor);
            console.log(`[LEDGER] Current HD path: ${currentHdPath}`);

            // Use the correct HDPath constants based on your project's definition
            if (currentHdPath !== BIP44_PATH) {
                // If not using BIP44, first try that
                console.log("[LEDGER] Trying BIP44 HD path");
                await setHardwareWalletHDPath(vendor, BIP44_PATH);
            } else {
                // If already using BIP44, try Ledger Live
                console.log("[LEDGER] Trying Ledger Live HD path");
                await setHardwareWalletHDPath(vendor, "m/44'/60'/0'/0"); // Ledger Live path
            }

            // Get accounts with new HD path
            const hdPath = await getHardwareWalletHDPath(vendor);
            console.log(`[LEDGER] New HD path set: ${hdPath}`);

            // Mark as attempted so we don't repeat
            allPathsAttempted.current = true;

            // Get accounts with new path
            await getAccounts();
        } catch (e) {
            log.error("Error trying alternative HD paths:", e);
            console.error("[LEDGER] Error trying alternative HD paths:", e);
        } finally {
            setState({
                gettingAccounts: false,
            });
        }
    };

    // Add a helper to detect if the current context is a UI context
    const isUIContext = (): boolean => {
        return typeof document !== 'undefined';
    };

    // Add an auto-reconnect effect that runs after initial rendering
    useEffect(() => {
        if (hdPath && !state.gettingAccounts && state.deviceAccounts.length === 0 && !needsUserInteraction) {
            const timer = setTimeout(() => {
                log.debug("Auto-reconnect: No accounts found after loading, checking for reconnection needs");

                const checkReconnectionNeeds = async () => {
                    try {
                        // Check if we have a stored interaction requirement first
                        if (chrome.storage?.session) {
                            const interactionResult = await chrome.storage.session.get('ledger_needs_user_interaction');

                            if (interactionResult.ledger_needs_user_interaction) {
                                const interactionData = interactionResult.ledger_needs_user_interaction;

                                // Only process recent interaction requests (last 5 minutes)
                                if (Date.now() - interactionData.timestamp < 300000) {
                                    log.debug("Found pending user interaction requirement", interactionData);

                                    // Attempt to automatically connect instead of requiring user interaction
                                    if (vendor === Devices.LEDGER && isUIContext()) {
                                        log.debug("Auto-reconnect: Attempting automatic WebHID connection");
                                        try {
                                            // Try automatic connection first
                                            await triggerWebHIDDirectly();
                                            return; // If successful, we're done
                                        } catch (e) {
                                            // Only show the user interaction prompt if auto-connect fails
                                            log.warn("Auto WebHID connection failed, falling back to user interaction", e);
                                            setNeedsUserInteraction(true);
                                            return;
                                        }
                                    } else {
                                        // For non-Ledger devices or non-UI contexts
                                        setNeedsUserInteraction(true);
                                        return;
                                    }
                                } else {
                                    // Old request, clear it
                                    await chrome.storage.session.remove('ledger_needs_user_interaction');
                                }
                            }
                        }

                        // If we reach here and still have no accounts, try WebHID directly for Ledger
                        if (vendor === Devices.LEDGER && isUIContext()) {
                            log.debug("Auto-reconnect: Attempting direct WebHID connection for Ledger");
                            try {
                                await triggerWebHIDDirectly();
                            } catch (e) {
                                log.warn("Auto WebHID connection failed, showing user interaction prompt", e);
                                setNeedsUserInteraction(true);
                            }
                        }
                    } catch (e) {
                        log.error("Error checking reconnection needs:", e);
                    }
                };

                checkReconnectionNeeds();
            }, 2000); // 2 second delay

            return () => clearTimeout(timer);
        }
    }, [hdPath, state.gettingAccounts, state.deviceAccounts.length, needsUserInteraction, vendor]);

    // Function to retrieve device accounts
    const getAccounts = useCallback(async () => {
        if (state.gettingAccounts) return;

        setState({
            gettingAccounts: true,
            deviceAccounts: [],
            errorMessage: ''
        });

        setFetchError(null);

        // For Ledger, try automatic connection first
        if (vendor === Devices.LEDGER) {
            // Check if we need to attempt automatic connection
            const isConnected = await ledgerBridge.checkWebHIDStatus();
            if (!isConnected) {
                log.debug("Ledger not connected, attempting automatic connection first");
                console.log("[LEDGER] Not connected, attempting automatic connection first");

                const autoConnected = await attemptAutomaticLedgerConnection();
                if (!autoConnected) {
                    log.debug("Automatic connection failed, will need to show manual connection");
                    console.log("[LEDGER] Automatic connection failed");

                    setState({
                        gettingAccounts: false,
                        deviceNotReady: true,
                        errorMessage: "Could not connect to Ledger automatically"
                    });
                    return;
                }
                log.debug("Automatic connection successful, proceeding to get accounts");
                console.log("[LEDGER] Automatic connection successful");
            }
        }

        try {
            log.debug(`Getting accounts for ${vendor}`);
            const accounts = await fetchAccountsWithRetry(
                vendor,
                2, // retryCount
                state.currentPage - 1,
                5 // always use 5 accounts per page
            );

            // Check if we have accounts
            if (!accounts || accounts.length === 0) {
                log.debug(`No accounts found for ${vendor}`);

                if (vendor === Devices.LEDGER) {
                    // Check Ethereum app is open
                    try {
                        const appStatus = await ledgerBridge.verifyEthereumAppOpen();
                        if (!appStatus.appOpen) {
                            console.log("[LEDGER] Ethereum app is not open");
                            setState({
                                gettingAccounts: false,
                                deviceNotReady: true,
                                ethAppStatus: 'closed',
                                errorMessage: 'Please open the Ethereum app on your Ledger device.'
                            });
                            return;
                        }
                    } catch (e) {
                        console.warn("[LEDGER] Error verifying Ethereum app:", e);
                    }
                }

                setState({
                    gettingAccounts: false,
                    deviceNotReady: true
                });
                return;
            }

            setState({
                deviceAccounts: accounts,
                gettingAccounts: false,
                ethAppStatus: 'open',
                errorMessage: ''
            });

            // Also clear the fetchError state
            setFetchError(null);
        } catch (error) {
            log.error(`Error fetching accounts: ${error.message || error}`);

            // Enhanced error handling for clearer user messages
            let errorMessage = error.message || "Failed to get accounts from your device.";

            if (vendor === Devices.LEDGER) {
                if (error.message.includes('Ethereum app') ||
                    error.message.includes('app is not open') ||
                    error.message === 'LEDGER_ETHEREUM_APP_CLOSED') {
                    errorMessage = 'Please open the Ethereum app on your Ledger device.';

                    setState({
                        gettingAccounts: false,
                        deviceNotReady: true,
                        ethAppStatus: 'closed',
                        errorMessage
                    });
                    return;
                } else if (error.message.includes('timeout')) {
                    errorMessage = 'Communication with Ledger timed out. Please make sure your device is unlocked and the Ethereum app is open.';
                }
            }

            setState({
                gettingAccounts: false,
                deviceNotReady: true,
                errorMessage
            });
        }
    }, [state.gettingAccounts, state.currentPage, vendor]);

    const toggleAccount = (account: DeviceAccountInfo) => {
        const selected = state.selectedAccounts.some(
            (a) => a.address === account.address
        )
            ? state.selectedAccounts.filter(
                (a) => a.address !== account.address
            )
            : [...state.selectedAccounts, account]

        setState({ selectedAccounts: selected })
    }

    const importAccounts = async () => {
        try {
            await runImportAccounts(
                new Promise(async (resolve, reject) => {
                    try {
                        // If this is handling accounts that need user interaction, handle differently
                        if (needsUserInteraction && vendor === Devices.LEDGER && chrome.storage?.session) {
                            console.log("[LEDGER] Importing accounts that need user interaction");

                            // Check if we need WebHID permission
                            const result = await chrome.storage.session.get(['ledger_needs_user_interaction']);
                            const interactionInfo = result.ledger_needs_user_interaction;

                            // Ensure we have a WebHID connection first
                            try {
                                console.log("[LEDGER] Ensuring WebHID connection before completing import");
                                await ledgerBridge.connectUsingWebHID();

                                // If we successfully connected, proceed with the import
                                await importHardwareWalletAccounts(
                                    state.selectedAccounts,
                                    vendor
                                );

                                // Clear the pending accounts from session storage
                                await chrome.storage.session.remove(['ledger_pending_accounts', 'ledger_needs_user_interaction']);
                                console.log("[LEDGER] Cleared pending accounts after successful import");

                                await selectAccount(state.selectedAccounts[0].address);
                                resolve(true);
                            } catch (connectError) {
                                console.error("[LEDGER] Error connecting to Ledger device:", connectError);
                                reject(new Error("Failed to connect to Ledger device. Please make sure your device is connected and unlocked with the Ethereum app open."));
                            }
                        } else {
                            // Normal flow for direct imports
                            await importHardwareWalletAccounts(
                                state.selectedAccounts,
                                vendor
                            );
                            await selectAccount(state.selectedAccounts[0].address);
                            resolve(true);
                        }
                    } catch (e) {
                        // Enhanced error handling for Ledger devices
                        if (vendor === Devices.LEDGER) {
                            if (e.message && typeof e.message === 'string') {
                                if (e.message.includes('timeout') || e.message.includes('Timeout')) {
                                    reject(new Error('Connection timed out. Make sure your Ledger is unlocked with the Ethereum app open.'));
                                } else if (e.message.includes('locked')) {
                                    reject(new Error('Ledger device is locked. Please unlock your device.'));
                                } else if (e.message.includes('denied') || e.message.includes('permission')) {
                                    reject(new Error('Permission denied. Please reconnect your Ledger and try again.'));
                                } else if (e.message.includes('document is not defined')) {
                                    // If we get a document error in the UI, something is very wrong
                                    console.error("[LEDGER] Unexpected document error in UI context:", e);
                                    reject(new Error('Internal error communicating with the Ledger device. Please try again.'));
                                }
                            }
                        }

                        // If no specific error was handled, pass the original error
                        reject(e);
                    }
                })
            );
            history.push({
                pathname: "/hardware-wallet/success",
                state: { vendor },
            });
        } catch (e) {
            log.error(e);
            setState({ deviceNotReady: true }); // Show device not ready dialog on error
        }
    }

    const isSelected = (address: string): boolean => {
        return state.selectedAccounts.some((a) => a.address === address)
    }

    const isDisabled = (address: string): boolean => {
        return existingAddresses.includes(address)
    }

    const updateHDPath = async (hdPath: string) => {
        try {
            log.debug(`Attempting to update HD path to ${hdPath}`);
            await setHardwareWalletHDPath(vendor, hdPath);

            // Clear the state after the HD path is updated
            setState({ selectedAccounts: [], currentPage: 1 });
            setHdPath(hdPath);
            log.debug(`HD path successfully updated to ${hdPath}`);
        } catch (e) {
            log.warn(`Error setting HD path: ${e.message}`);

            // If the error is because user interaction is required, we should handle it gracefully
            if (e.message && e.message.includes('user interaction')) {
                log.debug("User interaction required for HD path change, updating UI state only");

                // Still update the UI with the new path
                setState({ selectedAccounts: [], currentPage: 1 });
                setHdPath(hdPath);

                // Update our device connection status
                setState({ reconnecting: true });

                try {
                    // Attempt to reconnect the device
                    const isReconnected = await ensureKeyringInitialized(vendor);
                    if (isReconnected) {
                        log.debug("Successfully reconnected after HD path change");
                        // After reconnection, fetch accounts with the new HD path
                        await getAccounts();
                    } else {
                        log.debug("Reconnection failed, will use new HD path on next successful connection");
                        setState({ deviceNotReady: true });
                    }
                } catch (reconnectError) {
                    log.error("Failed to reconnect after HD path change:", reconnectError);
                    setState({ deviceNotReady: true });
                } finally {
                    setState({ reconnecting: false });
                }
            } else {
                // For other errors, show an error message
                setFetchError(`Failed to set HD path: ${e.message}`);
            }
        }
    }

    // Add a retry button handler
    const handleRetryFetch = async () => {
        setFetchError(null);
        await getAccounts();
    };

    // If searching alternative paths, show a special loading message
    const renderLoadingState = () => {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Spinner color="blue" size="32" />
                <p className="mt-4 text-primary-grey-dark text-center">
                    {vendor === Devices.LEDGER ? (
                        isSearchingAlternativePaths ? (
                            <>
                                Searching for accounts across different HD paths...<br />
                                Please wait...
                            </>
                        ) : (
                            <>
                                Loading accounts from your Ledger device.<br />
                                Please make sure the Ethereum app is open.<br />
                                This may take a few moments...
                            </>
                        )
                    ) : (
                        <>Loading accounts, please wait...</>
                    )}
                </p>
            </div>
        );
    };

    const renderNoAccountsState = () => {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <p className="text-primary-grey-dark text-center">
                    {vendor === Devices.LEDGER ? (
                        <>
                            No accounts found with current HD path.<br />
                            Try changing the HD path in Advanced Settings<br />
                            or make sure your Ledger has the Ethereum app open.
                        </>
                    ) : (
                        <>No accounts found. Try changing the HD path in Advanced Settings.</>
                    )}
                </p>
                {vendor === Devices.LEDGER && hdPath && (
                    <button
                        onClick={tryAlternativeHDPaths}
                        className="mt-4 bg-primary-blue-default hover:bg-primary-blue-hover text-white font-medium py-2 px-4 rounded-md"
                    >
                        Try Different HD Paths
                    </button>
                )}
            </div>
        );
    };

    // Add this content to render the user interaction prompt
    const renderUserInteractionPrompt = () => {
        return (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center">
                <div className="mb-6">
                    <div className="flex justify-center">
                        <UsbIcon className="w-14 h-14 text-blue-500 mb-4" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-gray-900">User Interaction Required</h3>
                    <p className="text-gray-600 mb-5 max-w-md mx-auto">
                        Your Ledger device requires direct access. The browser needs your permission to communicate with the device.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6 text-left max-w-md mx-auto">
                        <p className="mb-3 font-medium text-yellow-800">Automatic connection was attempted but requires your confirmation for security reasons.</p>
                        <ul className="list-disc pl-5 space-y-2 text-yellow-700">
                            <li>Ensure your Ledger is connected and unlocked</li>
                            <li>The Ethereum app should be open on your device</li>
                            <li>When prompted, select your Ledger device from the list</li>
                        </ul>
                    </div>
                </div>
                <div className="flex justify-center">
                    <ButtonWithLoading
                        onClick={async () => {
                            setNeedsUserInteraction(false);
                            setState({ reconnecting: true, errorMessage: '' });
                            setFetchError(null);

                            try {
                                // Use connectHardwareWallet to trigger a fresh connection with user gesture
                                const result = await connectHardwareWallet(vendor);

                                if (result === true || (typeof result === 'object' && result.needsUserGesture)) {
                                    // Clear any error messages on success
                                    setFetchError(null);
                                    setState({
                                        reconnecting: false,
                                        errorMessage: '',
                                        deviceNotReady: false
                                    });

                                    // If connection succeeds, get accounts
                                    getAccounts();
                                } else {
                                    setState({
                                        reconnecting: false,
                                        errorMessage: 'Connection failed. Please try again.'
                                    });
                                    setFetchError('Connection failed. Please try again.');
                                }
                            } catch (error) {
                                log.error('Failed to connect in user interaction mode:', error);
                                setState({
                                    reconnecting: false,
                                    errorMessage: 'Failed to connect to Ledger. Please try again.'
                                });
                                setFetchError('Failed to connect to Ledger. Please try again.');
                            }
                        }}
                        isLoading={state.reconnecting}
                        type="button"
                        label="Grant Permission"
                        buttonClass="w-full sm:w-auto px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm"
                    />
                </div>
            </div>
        );
    };

    // Add a handleUserInitiatedConnection function that uses triggerWebHIDDirectly
    const handleUserInitiatedConnection = async () => {
        try {
            setState({ gettingAccounts: true });
            setFetchError('');

            // For Ledger devices, directly trigger WebHID permission first
            if (vendor === Devices.LEDGER) {
                log.debug('Ledger device detected, triggering WebHID permission request');
                try {
                    const permissionGranted = await triggerWebHIDDirectly();
                    if (!permissionGranted) {
                        log.warn('Failed to get WebHID permission, user may have cancelled');
                        setFetchError('WebHID permission was not granted. Please try again and select your Ledger device when prompted.');
                        setState({ gettingAccounts: false });
                    }
                    return; // triggerWebHIDDirectly will call getAccounts after success
                } catch (error) {
                    log.error('Error requesting WebHID permission:', error);
                    setFetchError('Failed to request device access. Please try again.');
                    setState({ gettingAccounts: false });
                    return;
                }
            }

            // For non-Ledger devices, use standard connection flow
            const connectionResult = await connectHardwareWallet(vendor);

            if (connectionResult === true) {
                log.debug('Successfully connected hardware keyring');
                await getAccounts();
            } else if (typeof connectionResult === 'object' && connectionResult.needsUserGesture) {
                log.warn('Device connection requires user gesture');
                setNeedsUserInteraction(true);
                setState({ gettingAccounts: false });
            } else {
                log.error('Failed to connect hardware keyring', connectionResult);
                setFetchError('Failed to connect hardware wallet. Please check device connection and try again.');
                setState({ gettingAccounts: false });
            }
        } catch (e) {
            log.error('Error in handleUserInitiatedConnection', e);
            setFetchError(e instanceof Error ? e.message : 'Unknown error connecting to hardware wallet');
            setState({ gettingAccounts: false });
        }
    };

    // Add this to the useEffect that fetches accounts
    useEffect(() => {
        if (!state.gettingAccounts) return;

        (async () => {
            try {
                setState({ gettingAccounts: true, errorMessage: '' });

                // Try to get accounts with retry logic
                const accounts = await fetchAccountsWithRetry(vendor, 1);

                // Update ethAppStatus on successful fetch
                setState({
                    deviceAccounts: accounts,
                    gettingAccounts: false,
                    ethAppStatus: 'open',
                    errorMessage: ''
                });
            } catch (error) {
                log.error("Error getting accounts:", error);

                // Handle specific errors
                if (error.message === 'LEDGER_ETHEREUM_APP_CLOSED' ||
                    error.message.includes('Ethereum app') ||
                    error.message.includes('app is not open')) {
                    setState({
                        gettingAccounts: false,
                        deviceNotReady: true,
                        ethAppStatus: 'closed',
                        errorMessage: 'Please open the Ethereum app on your Ledger device and try again.'
                    });
                } else if (error.message.includes('timeout')) {
                    setState({
                        gettingAccounts: false,
                        deviceNotReady: true,
                        errorMessage: 'Communication with Ledger timed out. Please make sure your device is unlocked and the Ethereum app is open.'
                    });
                } else {
                    setState({
                        gettingAccounts: false,
                        deviceNotReady: true,
                        errorMessage: error.message || 'Failed to get accounts from your device.'
                    });
                }
            }
        })();
    }, [state.gettingAccounts, vendor]);

    // Function for explicit WebHID connection (used for manual connection)
    const triggerWebHIDDirectly = async (): Promise<boolean> => {
        setState({ reconnecting: true });

        try {
            log.debug("Triggering WebHID permission request directly");

            if (!isUIContext()) {
                log.warn("Cannot trigger WebHID in non-UI context");
                throw new Error("WebHID requires UI context");
            }

            // Clear any pending flags before starting
            if (chrome.storage?.session) {
                await chrome.storage.session.remove('ledger_needs_user_interaction');
                await chrome.storage.session.remove('ledger_needs_reconnection');
            }

            // Check if navigator.hid is available
            if (!navigator.hid) {
                log.error("WebHID API is not available in this browser");
                throw new Error("WebHID API is not available. Please use a compatible browser like Chrome.");
            }

            // First check if we already have permission to any Ledger devices
            const existingDevices = await navigator.hid.getDevices();
            const ledgerDevices = existingDevices.filter(d =>
                d.vendorId === 0x2c97 || d.vendorId === 0x2581
            );

            // If we already have permission to at least one Ledger device, use it
            if (ledgerDevices.length > 0) {
                log.debug(`Found ${ledgerDevices.length} Ledger devices we already have permission for`);

                // Store connection status
                if (chrome.storage?.session) {
                    await chrome.storage.session.set({
                        'ledger_connection_status': {
                            connected: true,
                            timestamp: Date.now(),
                            deviceCount: ledgerDevices.length
                        }
                    });

                    // Also store explicit permission flag to help background
                    await chrome.storage.session.set({
                        'ledger_explicit_permission': {
                            granted: true,
                            timestamp: Date.now(),
                            source: 'existing_device_permissions'
                        }
                    });
                }

                // Try to connect with the hardware wallet using existing permissions
                try {
                    const result = await connectHardwareWallet(vendor);
                    log.debug("Connect hardware wallet result using existing permissions:", result);

                    setState({
                        reconnecting: false,
                        errorMessage: '',
                        deviceNotReady: false
                    });

                    // Clear any fetch errors
                    setFetchError(null);

                    // After successful connection using existing permissions, try getting accounts
                    getAccounts();
                    return true;
                } catch (connectionError) {
                    log.warn("Error connecting using existing permissions, will attempt requesting new permissions:", connectionError);
                    // Fall through to requestDevice below
                }
            } else {
                log.debug("No existing Ledger device permissions found, will request new permissions");
            }

            // Request device access with Ledger vendor IDs
            log.debug("Requesting WebHID device access for Ledger");
            let devices;
            try {
                devices = await navigator.hid.requestDevice({
                    filters: [
                        { vendorId: 0x2c97 }, // New Ledger vendor ID
                        { vendorId: 0x2581 }  // Old Ledger vendor ID
                    ]
                });
            } catch (requestError) {
                // The user might have cancelled the permission request
                if (requestError.name === 'NotFoundError' ||
                    (requestError.message && requestError.message.includes('user gesture'))) {
                    log.warn("User cancelled the WebHID permission request");
                    setState({ reconnecting: false });
                    throw new Error("Permission request cancelled. Please try again and select your Ledger device when prompted.");
                }
                // Other errors should be rethrown
                throw requestError;
            }

            log.debug(`WebHID permission granted, got ${devices.length} devices`);

            if (devices && devices.length > 0) {
                // Store connection status
                if (chrome.storage?.session) {
                    await chrome.storage.session.set({
                        'ledger_connection_status': {
                            connected: true,
                            timestamp: Date.now()
                        }
                    });

                    // Also store explicit permission flag to help background
                    await chrome.storage.session.set({
                        'ledger_explicit_permission': {
                            granted: true,
                            timestamp: Date.now(),
                            source: 'triggerWebHIDDirectly'
                        }
                    });
                }

                // Try to connect with the hardware wallet now that we have permission
                try {
                    const result = await connectHardwareWallet(vendor);
                    log.debug("Connect hardware wallet result:", result);

                    setState({
                        reconnecting: false,
                        errorMessage: '',
                        deviceNotReady: false
                    });

                    // Clear any fetch errors
                    setFetchError(null);

                    // After successful WebHID permission, try getting accounts again
                    getAccounts();
                    return true;
                } catch (connectionError) {
                    log.error("Error connecting hardware wallet after WebHID permission:", connectionError);
                    throw connectionError;
                }
            } else {
                log.warn("No devices returned from WebHID requestDevice");
                throw new Error("No devices selected");
            }
        } catch (error) {
            log.error("WebHID permission request failed:", error);
            setState({ reconnecting: false });
            throw error;
        }
    };

    // Auto-set Ledger Live HD path for Ledger devices
    useEffect(() => {
        if (vendor === Devices.LEDGER) {
            // Find the Ledger Live path from HDPaths
            const ledgerLivePath = HDPaths[vendor].find(path => path.name === 'Ledger Live')?.path;
            if (ledgerLivePath && hdPath !== ledgerLivePath) {
                updateHDPath(ledgerLivePath);
            }
        }
    }, [vendor, hdPath]);

    return (
        <HardwareWalletSetupLayout
            title="Select Accounts"
            subtitle="Select which account you would like to import."
            buttons={
                <>
                    <ButtonWithLoading
                        label="Back"
                        buttonClass={combineClasses(Classes.liteButton, "h-14")}
                        disabled={isImportingAccounts}
                        onClick={() =>
                            history.push({
                                pathname:
                                    vendor === Devices.KEYSTONE
                                        ? isKeystoneConnected
                                            ? "/hardware-wallet"
                                            : "/hardware-wallet/keystone-connect"
                                        : "/hardware-wallet/connect",
                                state: { vendor },
                            })
                        }
                    />

                    <ButtonWithLoading
                        label="Import"
                        buttonClass={combineClasses(Classes.button, "h-14")}
                        isLoading={isImportingAccounts}
                        disabled={state.selectedAccounts.length === 0}
                        onClick={importAccounts}
                    />
                </>
            }
        >
            {(isImportingAccounts || isLoadingHDPath) && <LoadingOverlay />}
            {state.deviceNotReady && state.errorMessage && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-md p-4 mb-4 mx-auto max-w-md">
                    <p className="text-red-600 font-medium text-center">{state.errorMessage}</p>
                    <p className="mt-2 text-sm text-center">
                        {vendor === Devices.LEDGER ?
                            "Automatic connection was attempted but failed. Please follow the steps below to connect manually." :
                            "Please follow the steps below to connect your device."}
                    </p>
                </div>
            )}
            <HardwareDeviceNotLinkedDialog
                fullScreen
                vendor={vendor}
                onDone={() => {
                    setState({ deviceNotReady: false })
                    getAccounts()
                }}
                isOpen={state.deviceNotReady}
                cancelButton={needsUserInteraction}
                onCancel={() => {
                    setState({ deviceNotReady: false });
                    history.push({
                        pathname: "/hardware-wallet",
                        state: { vendor },
                    });
                }}
            />
            <div className="flex flex-col space-y-4 p-6">
                {needsUserInteraction ? (
                    // Show user interaction prompt if permission is needed
                    renderUserInteractionPrompt()
                ) : (
                    // Only show accounts section if we don't need user interaction
                    <div>
                        {state.deviceAccounts.length > 0 &&
                            !state.gettingAccounts ? (
                            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                                {state.deviceAccounts.map((account) => (
                                    <HardwareWalletAccount
                                        account={account}
                                        accountsBalances={accountsBalances}
                                        selected={isSelected(account.address)}
                                        disabled={isDisabled(account.address)}
                                        onChange={() => toggleAccount(account)}
                                        onBalanceFetched={addAccountBalance}
                                        key={account.index}
                                    />
                                ))}
                            </div>
                        ) : state.gettingAccounts ? (
                            renderLoadingState()
                        ) : fetchError ? (
                            <div className="flex flex-col items-center justify-center h-64">
                                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4 max-w-md">
                                    <p className="text-red-700 text-center font-medium">Error fetching accounts</p>
                                    <p className="text-red-600 text-center mt-2">{fetchError}</p>
                                </div>
                                <div className="flex space-x-4 mt-2">
                                    {vendor === Devices.LEDGER && (
                                        <Button
                                            type="button"
                                            onClick={triggerWebHIDDirectly}
                                            disabled={state.reconnecting}
                                            className={combineClasses(
                                                "bg-primary-700 hover:bg-primary-800 text-white font-medium py-2 px-4 rounded flex items-center",
                                                state.reconnecting ? "opacity-50 cursor-not-allowed" : ""
                                            )}
                                        >
                                            {state.reconnecting ? (
                                                <>
                                                    <LoadingSpinner className="w-4 h-4 mr-2" />
                                                    Connecting...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="mr-2">Connect Device</span>
                                                </>
                                            )}
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        onClick={handleRetryFetch}
                                        disabled={state.gettingAccounts}
                                        className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded flex items-center"
                                    >
                                        Retry
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            renderNoAccountsState()
                        )}
                    </div>
                )}

                {/* Pagination controls - only show if there are more than 5 total accounts */}
                {!needsUserInteraction && state.deviceAccounts.length > 5 && (
                    <div className="flex items-center justify-center mt-4">
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                            <button
                                onClick={() => setState({ currentPage: Math.max(1, state.currentPage - 1) })}
                                disabled={state.currentPage === 1 || isImportingAccounts}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-50 focus:z-10 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                &lt;
                            </button>
                            {Array.from({ length: Math.min(5, Math.ceil(state.deviceAccounts.length / 5)) }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setState({ currentPage: page })}
                                    disabled={page === state.currentPage || isImportingAccounts}
                                    className={`px-4 py-2 text-sm font-medium border ${page === state.currentPage
                                        ? 'text-white bg-blue-600 border-blue-600 hover:bg-blue-700'
                                        : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setState({ currentPage: Math.min(Math.ceil(state.deviceAccounts.length / 5), state.currentPage + 1) })}
                                disabled={state.currentPage >= Math.ceil(state.deviceAccounts.length / 5) || isImportingAccounts}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-50 focus:z-10 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                &gt;
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </HardwareWalletSetupLayout>
    )
}

export default HardwareWalletAccountsPage
