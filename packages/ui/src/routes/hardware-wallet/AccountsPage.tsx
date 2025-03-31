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
                setState({
                    gettingAccounts: false,
                    deviceNotReady: true
                });
                return false;
            }
        };

        checkNavigationState();
        run(getHardwareWalletHDPath(vendor));
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

            // Get accounts with new path - use the existing function pattern
            await getAccounts(true);
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
            // Add a delay before auto-reconnect to allow the page to render first
            const timer = setTimeout(() => {
                log.debug("Auto-reconnect: No accounts found after loading, checking for reconnection needs");

                const checkReconnectionNeeds = async () => {
                    try {
                        // First, check if there are any pending reconnection requirements
                        if (chrome.storage?.session) {
                            const reconnectResult = await chrome.storage.session.get('ledger_needs_reconnection');
                            if (reconnectResult.ledger_needs_reconnection) {
                                const reconnectData = reconnectResult.ledger_needs_reconnection;

                                // Only process recent reconnection requests (last 5 minutes)
                                if (Date.now() - reconnectData.timestamp < 300000) {
                                    log.debug("Found pending reconnection requirement", reconnectData);

                                    // Clear the requirement so we don't keep retrying
                                    await chrome.storage.session.remove('ledger_needs_reconnection');

                                    // Set UI to show interaction required
                                    setNeedsUserInteraction(true);
                                    return;
                                } else {
                                    // Old request, clear it
                                    await chrome.storage.session.remove('ledger_needs_reconnection');
                                }
                            }

                            // Next, check for user interaction requirements
                            const interactionResult = await chrome.storage.session.get('ledger_needs_user_interaction');
                            if (interactionResult.ledger_needs_user_interaction) {
                                const interactionData = interactionResult.ledger_needs_user_interaction;

                                // Only process recent interaction requests (last 5 minutes)
                                if (Date.now() - interactionData.timestamp < 300000) {
                                    log.debug("Found pending user interaction requirement", interactionData);

                                    // Set UI to show interaction required
                                    setNeedsUserInteraction(true);
                                    return;
                                } else {
                                    // Old request, clear it
                                    await chrome.storage.session.remove('ledger_needs_user_interaction');
                                }
                            }
                        }

                        // If we reach here and still have no accounts, try WebHID directly for Ledger
                        if (vendor === Devices.LEDGER && isUIContext()) {
                            log.debug("Auto-reconnect: Attempting direct WebHID connection for Ledger");
                            setNeedsUserInteraction(true);
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

    // Improve the getAccounts function to better handle retrieval errors
    const getAccounts = useCallback(async (isRetry: boolean = false) => {
        setState({ gettingAccounts: true });
        setFetchError(null); // Reset error state before new fetch
        setNeedsUserInteraction(false); // Reset user interaction requirement

        try {
            log.debug(`Fetching accounts for ${vendor}, page ${state.currentPage}, size ${state.pageSize}`);

            // Clear any previous reconnection needs
            if (chrome.storage?.session) {
                try {
                    await chrome.storage.session.remove('ledger_needs_reconnection');
                } catch (e) {
                    log.warn("Error clearing reconnection needs:", e);
                }
            }

            // First check if we might need WebHID permissions for Ledger
            if (vendor === Devices.LEDGER) {
                try {
                    if (chrome.storage?.session) {
                        // Check if Ledger needs user interaction
                        const result = await chrome.storage.session.get('ledger_needs_user_interaction');
                        if (result.ledger_needs_user_interaction) {
                            const interactionNeeded = result.ledger_needs_user_interaction;

                            if (Date.now() - interactionNeeded.timestamp < 300000) { // If recent (last 5 minutes)
                                log.debug("Found pending user interaction requirement", interactionNeeded);
                                setNeedsUserInteraction(true);
                                setState({ gettingAccounts: false });
                                return;
                            } else {
                                // Interaction requirement is old, clear it
                                await chrome.storage.session.remove('ledger_needs_user_interaction');
                            }
                        }

                        // Check for explicit WebHID permission before trying
                        const permResult = await chrome.storage.session.get('ledger_explicit_permission');
                        if (!permResult.ledger_explicit_permission?.granted) {
                            log.debug("No explicit WebHID permission found - will need user interaction");
                            setNeedsUserInteraction(true);
                            setState({ gettingAccounts: false });
                            return;
                        }
                    }
                } catch (e) {
                    log.warn("Error checking for interaction requirements or permissions:", e);
                }
            }

            // Try to get accounts
            try {
                const accounts = await getHardwareWalletAccounts(
                    vendor,
                    state.currentPage,
                    state.pageSize
                );

                if (accounts && accounts.length > 0) {
                    log.debug(`Retrieved ${accounts.length} accounts for ${vendor}`);
                    setState({
                        deviceAccounts: accounts,
                        gettingAccounts: false,
                    });
                } else {
                    log.warn(`No accounts found for ${vendor} with current HD path: ${hdPath}`);
                    setState({
                        deviceAccounts: [],
                        gettingAccounts: false,
                    });

                    // If we have permission but no accounts, we might need to trigger WebHID directly
                    if (vendor === Devices.LEDGER && isUIContext()) {
                        log.debug("No accounts but have permission, may need direct WebHID access");
                        setNeedsUserInteraction(true);
                    }
                }
            } catch (accountError) {
                log.error(`Failed to get accounts:`, accountError);

                // If this is a document not defined error, we need UI interaction
                if (accountError.message && accountError.message.includes('document is not defined')) {
                    log.debug("Account fetch failed due to service worker context limitation");
                    setNeedsUserInteraction(true);
                    setState({ gettingAccounts: false });
                    return;
                }

                throw accountError; // Re-throw for the main error handler
            }
        } catch (e) {
            log.error(`Failed to get accounts for ${vendor}:`, e);

            // Check for user interaction requirement first
            if (e.message && (
                e.message.includes('user interaction') ||
                e.message.includes('user gesture') ||
                e.message === 'LEDGER_USER_GESTURE_REQUIRED'
            )) {
                log.debug("Account fetch requires user interaction");
                setNeedsUserInteraction(true);
                setState({ gettingAccounts: false });
                return;
            }

            // Set appropriate error message based on error
            let errorMessage = 'Failed to fetch accounts';

            if (e.message) {
                if (vendor === Devices.LEDGER) {
                    if (e.message.includes('Ethereum app') || e.message.includes('Application')) {
                        errorMessage = 'Ethereum app not open on Ledger. Please open it and try again.';
                    } else if (e.message.includes('locked') || e.message.includes('CONDITIONS_OF_USE_NOT_SATISFIED')) {
                        errorMessage = 'Ledger device is locked. Please unlock your device.';
                    } else if (e.message.includes('Timeout') || e.message.includes('timed out') || e.message === 'LEDGER_ACCOUNT_FETCH_TIMEOUT') {
                        errorMessage = 'Connection timed out. Please check your Ledger device is still connected, has the Ethereum app open, and is not asleep.';
                    } else if (e.message.includes('U2F')) {
                        errorMessage = 'Browser compatibility issue. Try using Chrome.';
                    } else if (e.message.includes('disconnected')) {
                        errorMessage = 'Ledger disconnected. Please reconnect your device.';
                    } else if (e.message.includes('No keyring found')) {
                        errorMessage = 'Hardware wallet not properly connected. Please connect your device using the Connect button below.';
                        setNeedsUserInteraction(true);
                    } else if (e.message.includes('document is not defined')) {
                        errorMessage = 'Service worker cannot access WebHID. Please use the Connect button below.';
                        setNeedsUserInteraction(true);
                    } else if (e.message.includes('WebHID cannot be accessed')) {
                        errorMessage = 'WebHID access required. Please use the Connect button below.';
                        setNeedsUserInteraction(true);
                    }
                }
            }

            if (e.message && e.message.includes('No keyring found')) {
                log.warn('Keyring not found, attempting automatic reconnection for', vendor);

                // Add a little state to track reconnection attempts
                setState({ reconnecting: true });

                try {
                    // Try WebHID directly for Ledger in UI context
                    if (vendor === Devices.LEDGER && isUIContext()) {
                        log.debug('Attempting direct WebHID connection for Ledger');
                        try {
                            const result = await triggerWebHIDDirectly();
                            if (result) {
                                log.debug('Successfully triggered WebHID for Ledger');
                                // Small delay to let connection establish
                                setTimeout(() => {
                                    setState({ reconnecting: false });
                                    getAccounts();
                                }, 1000);
                                return;
                            }
                        } catch (webHidError) {
                            log.error('WebHID connection attempt failed:', webHidError);
                        }
                    }

                    // If direct WebHID didn't work or isn't applicable, try standard connection
                    let connectionSuccess = false;
                    const connectionResult = await connectHardwareWallet(vendor);

                    if (connectionResult === true) {
                        log.debug('Successfully reconnected to', vendor);
                        connectionSuccess = true;
                    } else if (typeof connectionResult === 'object' && connectionResult.needsUserGesture) {
                        // Need user gesture - show the user interaction UI
                        log.debug('Connection requires user gesture');
                        setNeedsUserInteraction(true);
                        setState({ reconnecting: false, gettingAccounts: false });
                        return;
                    }

                    // If reconnection worked, try fetching accounts again
                    if (connectionSuccess) {
                        log.debug('Retrying account fetch after reconnection');
                        setState({ reconnecting: false });

                        // Small delay to ensure connection is fully established
                        setTimeout(() => {
                            getAccounts();
                        }, 500);
                        return;
                    }
                } catch (reconnectError) {
                    log.error('Failed to automatically reconnect:', reconnectError);

                    // Check if this needs user interaction
                    if (reconnectError.message &&
                        (reconnectError.message.includes('user interaction') ||
                            reconnectError.message.includes('user gesture') ||
                            reconnectError.message.includes('document is not defined'))) {
                        setNeedsUserInteraction(true);
                        setState({ reconnecting: false, gettingAccounts: false });
                        return;
                    }
                }

                setState({ reconnecting: false });

                // Only show the error message if we're not showing the user interaction prompt
                if (!needsUserInteraction) {
                    setFetchError(errorMessage);
                }
            } else {
                setFetchError(errorMessage);
            }

            setState({
                gettingAccounts: false,
                deviceAccounts: []
            });
        }
    }, [state.currentPage, state.pageSize, vendor, hdPath, needsUserInteraction]);

    // Enhance triggerWebHIDDirectly to provide better feedback and ensure permission is set
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

            // First try to get already paired devices
            try {
                const pairedDevices = await navigator.hid.getDevices();
                log.debug(`Found ${pairedDevices.length} already paired HID devices`);

                // Filter for Ledger devices
                const ledgerDevices = pairedDevices.filter(
                    device => device.vendorId === 0x2c97 || device.vendorId === 0x2581
                );

                log.debug(`Found ${ledgerDevices.length} already paired Ledger devices`);

                // If we have paired Ledger devices, try to use them first
                if (ledgerDevices.length > 0) {
                    // Store connection status
                    if (chrome.storage?.session) {
                        await chrome.storage.session.set({
                            'ledger_connection_status': {
                                connected: true,
                                timestamp: Date.now()
                            }
                        });

                        // Also set explicit permission flag
                        await chrome.storage.session.set({
                            'ledger_explicit_permission': {
                                granted: true,
                                timestamp: Date.now(),
                                source: 'getDevices'
                            }
                        });

                        log.debug("Stored connection status and explicit permission from paired devices");
                    }

                    // Try to open the first device to make sure it's connectable
                    try {
                        const device = ledgerDevices[0];
                        if (!device.opened) {
                            await device.open();
                            log.debug("Successfully opened paired Ledger device");
                        }
                    } catch (openError) {
                        log.warn("Failed to open paired device, will request new permission:", openError);
                        // Continue to permission request below
                    }
                }
            } catch (getDevicesError) {
                log.warn("Error checking for paired devices:", getDevicesError);
                // Continue to permission request
            }

            // Request device access with Ledger vendor IDs
            log.debug("Requesting WebHID device access for Ledger");
            const devices = await navigator.hid.requestDevice({
                filters: [
                    { vendorId: 0x2c97 }, // New Ledger vendor ID
                    { vendorId: 0x2581 }  // Old Ledger vendor ID
                ]
            });

            log.debug(`WebHID permission granted, got ${devices.length} devices`);

            if (devices && devices.length > 0) {
                // Store both connection status and explicit permission flag
                if (chrome.storage?.session) {
                    try {
                        const permissionData = {
                            granted: true,
                            timestamp: Date.now(),
                            source: 'requestDevice'
                        };

                        log.debug("Storing WebHID permission data:", permissionData);

                        // Store connection status
                        await chrome.storage.session.set({
                            'ledger_connection_status': {
                                connected: true,
                                timestamp: Date.now()
                            }
                        });

                        // Also store explicit permission flag (separate operation for reliability)
                        await chrome.storage.session.set({
                            'ledger_explicit_permission': permissionData
                        });

                        // Verify the permission flag was set correctly
                        const verification = await chrome.storage.session.get('ledger_explicit_permission');
                        if (verification.ledger_explicit_permission?.granted) {
                            log.debug("WebHID permission flag stored successfully", verification.ledger_explicit_permission);
                        } else {
                            log.warn("WebHID permission flag not stored correctly");
                        }

                    } catch (storageError) {
                        log.error("Failed to store WebHID permission status:", storageError);
                    }
                }

                // Try to open the device to ensure we have a valid connection
                try {
                    const device = devices[0];
                    if (!device.opened) {
                        await device.open();
                        log.debug("Successfully opened WebHID device");
                    }
                } catch (openError) {
                    log.warn("Failed to open device, but continuing with permission granted:", openError);
                }

                // Try to connect with the hardware wallet now that we have permission
                try {
                    log.debug("Trying to connect hardware wallet with explicit permission");
                    const result = await connectHardwareWallet(vendor);
                    log.debug("Connect hardware wallet result:", result);

                    // Small delay to allow connection to establish before continuing
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Verify the keyring was created properly - try setting HD path as a test
                    try {
                        if (hdPath) {
                            log.debug(`Verifying connection by setting HD path to ${hdPath}`);
                            await setHardwareWalletHDPath(vendor, hdPath);
                            log.debug("Successfully set HD path - connection is working");
                        }
                    } catch (verifyError) {
                        log.warn("Verification of connection failed:", verifyError);
                        // Continue anyway - the connection might still work
                    }

                    setState({ reconnecting: false });
                    // After successful WebHID permission, try getting accounts again
                    getAccounts();

                    return true;
                } catch (connectionError) {
                    log.error("Error connecting hardware wallet after WebHID permission:", connectionError);

                    // Try one more approach - use connectHardwareWallet with a delay
                    try {
                        log.debug("Attempting secondary connection approach after 1 second delay");
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        const secondAttempt = await connectHardwareWallet(vendor);
                        log.debug("Secondary connection attempt result:", secondAttempt);

                        setState({ reconnecting: false });
                        getAccounts();
                        return true;
                    } catch (secondError) {
                        log.error("Secondary connection attempt also failed:", secondError);
                        throw connectionError;
                    }
                }
            } else {
                log.warn("No devices returned from WebHID requestDevice");
                throw new Error("No devices selected");
            }
        } catch (error) {
            log.error("WebHID permission request failed:", error);

            // If user denied permission, record this to prevent immediate repeated requests
            if (error.name === 'NotFoundError' || error.message?.includes('denied')) {
                try {
                    if (chrome.storage?.session) {
                        await chrome.storage.session.set({
                            'ledger_permission_denied': {
                                timestamp: Date.now()
                            }
                        });
                    }
                } catch (e) {
                    log.warn("Failed to store permission denial:", e);
                }
            }

            setState({ reconnecting: false });
            throw error;
        }
    };

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
                        await importHardwareWalletAccounts(
                            state.selectedAccounts,
                            vendor
                        )
                        await selectAccount(state.selectedAccounts[0].address)
                        resolve(true)
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
                                }
                            }
                        }

                        // If no specific error was handled, pass the original error
                        reject(e)
                    }
                })
            )
            history.push({
                pathname: "/hardware-wallet/success",
                state: { vendor },
            })
        } catch (e) {
            log.error(e)
            setState({ deviceNotReady: true }) // Show device not ready dialog on error
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

    const onUpdatePageSize = (pageSize: number) => {
        setState({
            pageSize,
            currentPage: 1,
        })
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
            <div className="text-center p-4">
                <div className="mb-6">
                    <UsbIcon className="w-10 h-10 mx-auto text-blue-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">User Interaction Required</h3>
                    <p className="text-gray-600 mb-4">
                        Your Ledger device requires direct access. The browser needs your permission to communicate with the device.
                    </p>
                    <div className="text-sm text-left bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Ensure your Ledger is connected and unlocked</li>
                            <li>The Ethereum app should be open on your device</li>
                            <li>Click the button below to grant access permission</li>
                        </ul>
                    </div>
                </div>
                <div className="flex justify-center">
                    <ButtonWithLoading
                        onClick={async () => {
                            setNeedsUserInteraction(false);
                            try {
                                // Use connectHardwareWallet to trigger a fresh connection with user gesture
                                const result = await connectHardwareWallet(vendor);
                                if (result === true) {
                                    // If connection succeeds, get accounts
                                    getAccounts();
                                } else {
                                    setFetchError('Connection failed. Please try again.');
                                }
                            } catch (error) {
                                log.error('Failed to connect in user interaction mode:', error);
                                setFetchError('Failed to connect to Ledger. Please try again.');
                            }
                        }}
                        isLoading={false}
                        type="button"
                        label="Connect to Ledger"
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
            <HardwareDeviceNotLinkedDialog
                fullScreen
                vendor={vendor}
                onDone={() => {
                    setState({ deviceNotReady: false })
                    getAccounts()
                }}
                isOpen={state.deviceNotReady}
            />
            {(isImportingAccounts || isLoadingHDPath) && <LoadingOverlay />}
            <div className="flex flex-col space-y-2 text-sm text-primary-grey-dark p-8">
                <div style={{ minHeight: "280px" }}>
                    {state.deviceAccounts.length > 0 &&
                        !state.gettingAccounts ? (
                        state.deviceAccounts.map((account) => (
                            <HardwareWalletAccount
                                account={account}
                                accountsBalances={accountsBalances}
                                selected={isSelected(account.address)}
                                disabled={isDisabled(account.address)}
                                onChange={() => toggleAccount(account)}
                                onBalanceFetched={addAccountBalance}
                                key={account.index}
                            />
                        ))
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
                                                <UsbIcon className="w-4 h-4" />
                                            </>
                                        )}
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    onClick={handleRetryFetch}
                                    disabled={state.gettingAccounts || state.reconnecting}
                                    className={combineClasses(
                                        "bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded",
                                        state.reconnecting ? "opacity-50 cursor-not-allowed" : ""
                                    )}
                                >
                                    Retry
                                </Button>
                            </div>
                        </div>
                    ) : (
                        renderNoAccountsState()
                    )}
                </div>

                {enabledPagination ? (
                    <div className="flex w-full justify-between pt-6 items-center pl-2 space-x-2">
                        <div className="space-x-4 flex items-center max-h-10">
                            <span className="text-primary-grey-dark">
                                Show:
                            </span>
                            <Select
                                onChange={onUpdatePageSize}
                                currentValue={state.pageSize}
                                id="pageSize"
                                disabled={state.gettingAccounts}
                            >
                                <Select.Option value={5}>5</Select.Option>
                                <Select.Option value={8}>8</Select.Option>
                                <Select.Option value={10}>10</Select.Option>
                            </Select>
                        </div>
                        <PaginationControls
                            disabled={state.gettingAccounts}
                            stickyFirstPage
                            currentPage={state.currentPage}
                            onChangePage={(page: number) =>
                                setState({ currentPage: page })
                            }
                            pages={6}
                        />
                    </div>
                ) : (
                    <div className="flex w-full justify-between pt-6 items-center pl-2 space-x-2">
                        <PaginationControls
                            disabled={state.gettingAccounts}
                            stickyFirstPage
                            currentPage={state.currentPage}
                            onChangePage={(page: number) =>
                                setState({ currentPage: page })
                            }
                            pages={2}
                            className="!w-full"
                            showArrows={false}
                        />
                    </div>
                )}
                {vendor !== Devices.KEYSTONE && (
                    <AccountsPageAdvancedSettings
                        currentHDPath={hdPath || ""}
                        vendor={vendor}
                        disabled={isImportingAccounts}
                        setHDPath={updateHDPath}
                        isLoadingHDPath={isLoadingHDPath}
                    />
                )}
                {vendor === Devices.KEYSTONE && isKeystoneConnected && (
                    <>
                        <div
                            onClick={() =>
                                history.push({
                                    pathname: "/hardware-wallet/remove-device",
                                    state: { isFromAccountsPage: true },
                                })
                            }
                            className={combineClasses(
                                "w-full px-40 !mt-6 !-mb-5 bg-white rounded-md cursor-pointer underline-offset-1",
                                "flex hover:underline"
                            )}
                        >
                            <span className="font-normal text-xs text-blue-700 text-center">
                                Remove this device
                            </span>
                        </div>
                    </>
                )}
            </div>
            {needsUserInteraction && renderUserInteractionPrompt()}

            {/* Only show the error message if we're not showing the user interaction prompt */}
            {fetchError && !needsUserInteraction && (
                <div className="text-red-500 text-center mb-4">
                    {fetchError}
                </div>
            )}

            {/* Improve the HD path selector to show reconnect option when needed */}
            <div className="mt-3 mb-5">
                <div className="flex flex-wrap items-center justify-between mb-2">
                    <p className="text-base font-medium text-gray-700">HD Path</p>
                    <div className="flex items-center">
                        {/* Only show status indicators if we have a valid vendor */}
                        {vendor && (
                            <div className="flex items-center mr-3">
                                {state.reconnecting ? (
                                    <div className="flex items-center text-yellow-700">
                                        <LoadingSpinner className="w-4 h-4 mr-1" />
                                        <span className="text-xs">Connecting...</span>
                                    </div>
                                ) : needsUserInteraction ? (
                                    <div className="flex items-center text-yellow-700">
                                        <WarningIcon className="w-4 h-4 mr-1" />
                                        <span className="text-xs">Connection required</span>
                                    </div>
                                ) : state.gettingAccounts ? (
                                    <div className="flex items-center text-blue-700">
                                        <LoadingSpinner className="w-4 h-4 mr-1" />
                                        <span className="text-xs">Loading accounts</span>
                                    </div>
                                ) : state.deviceAccounts.length > 0 ? (
                                    <div className="flex items-center text-green-700">
                                        <CheckIcon className="w-4 h-4 mr-1" />
                                        <span className="text-xs">Connected</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center text-gray-500">
                                        <span className="text-xs">Not connected</span>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex items-center">
                            <Button
                                onClick={getAccounts}
                                disabled={state.gettingAccounts || state.reconnecting}
                                size="small"
                                className="py-1 px-2 text-xs font-medium"
                            >
                                {state.gettingAccounts ? "Loading..." : "Refresh"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add error message display */}
            {state.errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <div className="flex items-center">
                        <WarningIcon className="w-5 h-5 mr-2" />
                        <span>{state.errorMessage}</span>
                    </div>
                    {state.ethAppStatus === 'closed' && (
                        <div className="mt-2">
                            <Button
                                className="bg-blue-600 text-white py-2 px-4 rounded"
                                onClick={() => setState({ gettingAccounts: true, deviceNotReady: false, errorMessage: '' })}
                            >
                                Retry
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Add Ethereum app status indicator when on Ledger */}
            {vendor === Devices.LEDGER && state.ethAppStatus !== 'unknown' && (
                <div className={`flex items-center mb-4 ${state.ethAppStatus === 'open' ? 'text-green-600' : 'text-red-600'}`}>
                    {state.ethAppStatus === 'open' ? (
                        <CheckIcon className="w-5 h-5 mr-2" />
                    ) : (
                        <WarningIcon className="w-5 h-5 mr-2" />
                    )}
                    <span>
                        {state.ethAppStatus === 'open'
                            ? 'Ethereum app is open'
                            : 'Ethereum app is not open on your Ledger device'}
                    </span>
                </div>
            )}
        </HardwareWalletSetupLayout>
    )
}

export default HardwareWalletAccountsPage
