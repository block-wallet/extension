import { useCallback, useEffect, useMemo, useReducer, useState } from "react"

import LoadingOverlay from "../../components/loading/LoadingOverlay"
import {
    getHardwareWalletAccounts,
    importHardwareWalletAccounts,
    getHardwareWalletHDPath,
    setHardwareWalletHDPath,
    selectAccount,
    connectHardwareWallet,
    completeHardwareConnection,
} from "../../context/commActions"
import {
    AccountInfo,
    DeviceAccountInfo,
} from "@block-wallet/background/controllers/AccountTrackerController"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import classnames from "classnames"
import { Classes } from "../../styles"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import HardwareWalletSetupLayout from "./SetupLayout"
import Select from "../../components/input/Select"
import Spinner from "../../components/spinner/Spinner"
import log from "loglevel"
import useAsyncInvoke, { Status } from "../../util/hooks/useAsyncInvoke"
import PaginationControls from "../../components/ui/Pagination/PaginationControls"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import { BigNumber } from "@ethersproject/bignumber"
import { AccountsPageAdvancedSettings } from "../../components/hardwareWallet/AdvancedSettings"
import { HardwareWalletAccount } from "../../components/hardwareWallet/HardwareWalletAccount"

// Assets & icons
import { mergeReducer } from "../../util/reducerUtils"
import { useBlankState } from "../../context/background/backgroundHooks"
import { BIP44_PATH, Devices, HDPaths } from "../../context/commTypes"

interface State {
    gettingAccounts: boolean
    selectedAccounts: DeviceAccountInfo[]
    deviceAccounts: DeviceAccountInfo[]

    pageSize: number
    currentPage: number

    // HW state
    deviceNotReady: boolean
    reconnecting: boolean
}

const initialState: State = {
    gettingAccounts: true,
    selectedAccounts: [],
    deviceAccounts: [],
    pageSize: 5,
    currentPage: 1,
    deviceNotReady: false,
    reconnecting: false,
}

async function ensureKeyringInitialized(vendor: Devices): Promise<boolean> {
    if (vendor !== Devices.LEDGER) return true; // Only needed for Ledger

    log.debug("Ensuring Ledger keyring is properly initialized");

    // First check if we've explicitly stored a connection status in storage
    if (chrome.storage?.session) {
        try {
            const connectionStatus = await chrome.storage.session.get('ledger_connection_status');
            if (connectionStatus.ledger_connection_status?.connected &&
                Date.now() - connectionStatus.ledger_connection_status.timestamp < 60000) { // If connected in last minute

                log.debug("Found recent Ledger connection status in session storage");
                // Store vendor in session storage for better restoration
                sessionStorage.setItem('hw_vendor', vendor);
                return true;
            }
        } catch (e) {
            log.error("Failed to check Ledger connection status:", e);
        }
    }

    // Try multiple initialization approaches with retry logic
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            attempts++;
            log.debug(`Initialization attempt ${attempts}/${maxAttempts}`);

            // Try to initialize the keyring in the UI context where DOM is available
            const result = await connectHardwareWallet(vendor);

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
                    } catch (storageError) {
                        log.error("Failed to store connection status:", storageError);
                    }
                }

                // Store vendor in session storage for better restoration
                sessionStorage.setItem('hw_vendor', vendor);

                log.debug("Ledger keyring initialization successful");
                return true;
            }

            // If we're here, connection wasn't successful
            log.warn(`Ledger connection attempt ${attempts} did not return success`);

            // Wait before retrying
            if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (e) {
            log.error(`Failed to initialize Ledger keyring (attempt ${attempts}/${maxAttempts}):`, e);

            if (attempts >= maxAttempts) {
                // Last attempt - check if we have a connection status that indicates success
                try {
                    if (chrome.storage?.session) {
                        const result = await chrome.storage.session.get('ledger_connection_status');
                        if (result.ledger_connection_status && result.ledger_connection_status.connected) {
                            // We have a connection status, so we can proceed even without a proper keyring
                            log.debug("Proceeding with minimal keyring connection based on status");
                            return true;
                        }
                    }
                } catch (storageError) {
                    log.error("Failed to check connection status:", storageError);
                }

                return false;
            }

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return false;
}

const HardwareWalletAccountsPage = () => {
    const history = useOnMountHistory()!
    const [enabledPagination, setEnabledPagination] = useState(true)

    const getVendorFromUrlOrHistory = (): Devices => {
        try {
            // First check if vendor is in history state
            if (history.location.state && history.location.state.vendor) {
                const vendor = history.location.state.vendor;
                log.debug(`Found vendor in history state: ${vendor}`);
                return vendor as Devices;
            }

            // Then check URL hash for vendor parameter
            const hash = history.location.hash || window.location.hash;
            if (hash) {
                // Try to extract vendor from URL patterns like #/hardware-wallet/connect/ledger or #/hardware-wallet/accounts?vendor=ledger
                const vendorPattern1 = /\/hardware-wallet\/connect\/([a-zA-Z0-9_]+)/i;
                const vendorMatch1 = vendorPattern1.exec(hash);
                if (vendorMatch1 && vendorMatch1[1]) {
                    const vendor = vendorMatch1[1].toUpperCase() as Devices;
                    log.debug(`Found vendor in URL path: ${vendor}`);
                    return vendor;
                }

                // Check for URL query parameter
                const vendorPattern2 = /[?&]vendor=([a-zA-Z0-9_]+)/i;
                const vendorMatch2 = vendorPattern2.exec(hash);
                if (vendorMatch2 && vendorMatch2[1]) {
                    const vendor = vendorMatch2[1].toUpperCase() as Devices;
                    log.debug(`Found vendor in URL query parameter: ${vendor}`);
                    return vendor;
                }
            }

            // Check session storage as fallback
            if (chrome.storage?.session) {
                const vendorFromStorage = sessionStorage.getItem('hw_vendor');
                if (vendorFromStorage) {
                    try {
                        const vendor = vendorFromStorage.toUpperCase() as Devices;
                        log.debug(`Found vendor in session storage: ${vendor}`);
                        return vendor;
                    } catch (e) {
                        log.error('Error parsing vendor from session storage:', e);
                    }
                }
            }
        } catch (e) {
            log.error('Error parsing URL params:', e);
        }

        // Default to LEDGER if we can't determine the vendor
        log.warn('Could not determine vendor from history or URL, defaulting to LEDGER');
        return Devices.LEDGER;
    };

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

    useEffect(() => {
        // Check for direct navigation state from service worker
        const checkNavigationState = async () => {
            try {
                if (chrome.storage && chrome.storage.session) {
                    const result = await chrome.storage.session.get('navigation_state');
                    if (result.navigation_state) {
                        // Clear the state to prevent using it again
                        await chrome.storage.session.remove('navigation_state');
                        log.debug("Retrieved navigation state from session storage");
                    }
                }
            } catch (e) {
                log.error("Error checking navigation state:", e);
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
        if (vendor !== Devices.LEDGER || !hdPath) return;

        // Set searching state
        setIsSearchingAlternativePaths(true);
        setState({ gettingAccounts: true });

        // Define alternative paths to try
        const alternativePaths = [
            "m/44'/60'/0'/0",     // Ledger Legacy
            "m/44'/60'/0'/0/0",   // Ledger Live
            "m/44'/60'/0'"        // Alternative
        ].filter(path => path !== hdPath);

        log.debug(`Trying ${alternativePaths.length} alternative HD paths: ${alternativePaths.join(', ')}`);

        // Add current path to checked paths
        setHdPathsChecked(prev => [...prev, hdPath]);

        // Try each path
        for (const path of alternativePaths) {
            try {
                log.debug(`Attempting HD path: ${path}`);

                // Set the HD path
                await setHardwareWalletHDPath(vendor, path);
                setHdPath(path);

                // Add to checked paths
                setHdPathsChecked(prev => [...prev, path]);

                // Fetch accounts with this path
                const accounts = await getHardwareWalletAccounts(
                    vendor,
                    state.currentPage,
                    state.pageSize
                );

                if (accounts && accounts.length > 0) {
                    log.info(`Found ${accounts.length} accounts with HD path: ${path}`);
                    setState({
                        deviceAccounts: accounts,
                        gettingAccounts: false,
                    });

                    // Success! No need to try more paths
                    setIsSearchingAlternativePaths(false);
                    return;
                }

                log.debug(`No accounts found with HD path: ${path}`);
            } catch (e) {
                log.error(`Error trying HD path ${path}:`, e);
                // Continue to next path
            }
        }

        // If we got here, we tried all paths with no success
        log.warn("Tried all HD paths, none returned accounts");
        setIsSearchingAlternativePaths(false);
        setState({
            deviceAccounts: [],
            gettingAccounts: false,
        });
    };

    const getAccounts = useCallback(async () => {
        setState({ gettingAccounts: true });
        setFetchError(null); // Reset error state before new fetch

        try {
            log.debug(`Fetching accounts for ${vendor}, page ${state.currentPage}, size ${state.pageSize}`);
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
            }
        } catch (e) {
            log.error(`Failed to get accounts for ${vendor}:`, e);

            // Set appropriate error message based on error
            let errorMessage = 'Failed to fetch accounts';

            if (e.message) {
                if (vendor === Devices.LEDGER) {
                    if (e.message.includes('Ethereum app') || e.message.includes('Application')) {
                        errorMessage = 'Ethereum app not open on Ledger. Please open it and try again.';
                    } else if (e.message.includes('locked') || e.message.includes('CONDITIONS_OF_USE_NOT_SATISFIED')) {
                        errorMessage = 'Ledger device is locked. Please unlock your device.';
                    } else if (e.message.includes('Timeout') || e.message.includes('timed out')) {
                        errorMessage = 'Connection timed out. Please check your Ledger device.';
                    } else if (e.message.includes('U2F')) {
                        errorMessage = 'Browser compatibility issue. Try using Chrome.';
                    } else if (e.message.includes('disconnected')) {
                        errorMessage = 'Ledger disconnected. Please reconnect your device.';
                    }
                }
            }

            if (e.message && e.message.includes('No keyring found')) {
                log.warn('Keyring not found, attempting automatic reconnection for', vendor);

                // Add a little state to track reconnection attempts
                setState({ reconnecting: true });

                try {
                    // First, try connecting the hardware wallet again
                    let connectionSuccess = false;
                    const connectionResult = await connectHardwareWallet(vendor);

                    if (connectionResult === true) {
                        log.debug('Successfully reconnected to', vendor);
                        connectionSuccess = true;
                    } else if (typeof connectionResult === 'object' && connectionResult.needsUserGesture) {
                        // Need user gesture - try to complete connection
                        const completed = await completeHardwareConnection(vendor);
                        if (completed) {
                            log.debug('Successfully completed reconnection to', vendor);
                            connectionSuccess = true;
                        }
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
                }

                setState({ reconnecting: false });

                // Customize error message for keyring not found
                errorMessage = `Hardware wallet connection lost. You may need to reconnect your ${vendor} device.`;
            }

            setFetchError(errorMessage);
            setState({
                gettingAccounts: false,
                deviceAccounts: []
            });
        }
    }, [state.currentPage, state.pageSize, vendor, hdPath]);

    // Add this new function to check for pending user interaction requests
    const checkForPendingUserInteraction = useCallback(async () => {
        if (typeof chrome !== 'undefined' && chrome.storage?.session) {
            try {
                const result = await chrome.storage.session.get(`${vendor.toLowerCase()}_needs_user_interaction`);
                const interactionStatus = result[`${vendor.toLowerCase()}_needs_user_interaction`];

                if (interactionStatus && interactionStatus.status === 'pending') {
                    log.debug(`Found pending user interaction for ${vendor}`);
                    setNeedsUserInteraction(true);
                    // Clear any previous errors to show the new message
                    setFetchError('');
                    return true;
                }
            } catch (e) {
                log.error('Failed to check for pending user interaction:', e);
            }

            setNeedsUserInteraction(false);
            return false;
        }
        return false;
    }, [vendor]);

    // Add this to the initialization effect
    useEffect(() => {
        if (hdPath) {
            const initAndGetAccounts = async () => {
                setState({ gettingAccounts: true });
                setFetchError('');

                // First check if we need user interaction (from a previous attempt)
                const needsInteraction = await checkForPendingUserInteraction();
                if (needsInteraction) {
                    setState({ gettingAccounts: false });
                    return;
                }

                // Rest of the existing code
                if (vendor === Devices.LEDGER) {
                    try {
                        log.debug(`Initializing ${vendor} connection before getting accounts...`);
                        await ensureKeyringInitialized(vendor);

                        // After successful connection, set the HD path explicitly
                        log.debug(`Setting HD path for ${vendor} to ${hdPath}`);
                        try {
                            await setHardwareWalletHDPath(vendor, hdPath);
                        } catch (hdPathError) {
                            log.error(`Failed to set HD path for ${vendor}:`, hdPathError);

                            // Check if this is a user interaction error
                            if (hdPathError instanceof Error &&
                                (hdPathError.message.includes('user interaction') ||
                                    hdPathError.message.includes('user gesture'))) {
                                setNeedsUserInteraction(true);
                                setFetchError('');
                            } else {
                                setFetchError(`Connected to device but failed to set HD path. Please try again or select a different HD path.`);
                            }
                            setState({ gettingAccounts: false });
                            return;
                        }

                        // Now try to get accounts
                        try {
                            log.debug(`Fetching accounts for ${vendor} after explicit connection`);
                            await getAccounts();
                        } catch (accountError) {
                            log.error(`Failed to get accounts after explicit connection:`, accountError);

                            // Check if this is a user interaction error
                            if (accountError instanceof Error &&
                                (accountError.message.includes('user interaction') ||
                                    accountError.message.includes('user gesture'))) {
                                setNeedsUserInteraction(true);
                                setFetchError('');
                            } else {
                                setFetchError(`Connection established but could not fetch accounts. Please ensure your ${vendor} device has the Ethereum app open and try again.`);
                            }
                            setState({ gettingAccounts: false });
                        }
                    } catch (e) {
                        log.error(`Failed to initialize ${vendor} connection:`, e);

                        // Check if this is a user interaction error
                        if (e instanceof Error &&
                            (e.message.includes('user interaction') ||
                                e.message.includes('user gesture'))) {
                            setNeedsUserInteraction(true);
                            setFetchError('');
                            setState({ gettingAccounts: false });
                            return;
                        }

                        // Initialize keyring in UI context as fallback
                        const initialized = await ensureKeyringInitialized(vendor);
                        if (!initialized) {
                            setFetchError(`Failed to initialize ${vendor} connection. Please ensure your device is connected and try again.`);
                            setState({
                                gettingAccounts: false,
                                deviceAccounts: []
                            });
                            return;
                        }

                        // If initialized successfully, proceed with getAccounts
                        getAccounts();
                    }
                } else if (vendor === Devices.KEYSTONE) {
                    checkKeystoneAccounts();
                    getAccounts();
                } else {
                    getAccounts();
                }
            };

            initAndGetAccounts();
        }
    }, [checkKeystoneAccounts, getAccounts, hdPath, vendor, checkForPendingUserInteraction]);

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

    // Helper function to directly request WebHID permissions
    const triggerWebHIDDirectly = async (): Promise<boolean> => {
        try {
            log.debug('Attempting to directly trigger WebHID requestDevice API');

            // Check if navigator.hid is available
            if (!navigator.hid) {
                log.error('WebHID API is not available in this browser');
                return false;
            }

            // Clear any pending flags in session storage first
            try {
                if (chrome.storage?.session) {
                    await chrome.storage.session.remove('ledger_needs_user_interaction');
                    log.debug('Cleared ledger_needs_user_interaction flag before WebHID request');
                }
            } catch (e) {
                log.warn('Failed to clear ledger_needs_user_interaction flag', e);
            }

            // Request device access - this API requires a user gesture
            const devices = await navigator.hid.requestDevice({
                filters: [
                    // Ledger Nano S/X filters
                    { vendorId: 0x2c97 }, // Ledger vendor ID
                    { vendorId: 0x2581 }  // Older Ledger vendor ID
                ]
            });

            log.debug(`WebHID requestDevice returned ${devices.length} devices`);

            // Check if we got any devices
            if (devices.length > 0) {
                log.debug('Successfully obtained WebHID permissions');

                // Store successful connection status in session storage
                try {
                    if (chrome.storage?.session) {
                        await chrome.storage.session.set({
                            'ledger_connection_status': {
                                connected: true,
                                timestamp: Date.now(),
                                deviceCount: devices.length
                            }
                        });
                        log.debug('Stored successful WebHID connection status');
                    }
                } catch (e) {
                    log.warn('Failed to store Ledger connection status', e);
                }

                return true;
            } else {
                log.debug('User did not select any devices in the WebHID dialog');
                return false;
            }
        } catch (e) {
            log.error('Error requesting WebHID permission:', e);

            // If we have a SecurityError, it means the user denied permission
            if (e instanceof DOMException && e.name === 'SecurityError') {
                log.warn('User denied WebHID permission');

                // Store this information so we don't keep asking immediately
                try {
                    if (chrome.storage?.session) {
                        await chrome.storage.session.set({
                            'ledger_permission_denied': {
                                timestamp: Date.now()
                            }
                        });
                    }
                } catch (storageErr) {
                    // Just log, don't throw
                    log.warn('Failed to store permission denied state', storageErr);
                }
            }

            return false;
        }
    };

    // Update the handleUserInitiatedConnection function to use triggerWebHIDDirectly for Ledger
    const handleUserInitiatedConnection = async () => {
        try {
            setState({ gettingAccounts: true });
            setFetchError('');

            // For Ledger devices, directly trigger WebHID permission first
            if (vendor === Devices.LEDGER) {
                log.debug('Ledger device detected, triggering WebHID permission request');
                const permissionGranted = await triggerWebHIDDirectly();

                if (!permissionGranted) {
                    log.warn('Failed to get WebHID permission, user may have cancelled');
                    setFetchError('WebHID permission was not granted. Please try again and select your Ledger device when prompted.');
                    setState({ gettingAccounts: false });
                    return;
                }

                log.debug('WebHID permission granted, proceeding with connection');

                // Check if we have a pending HD path operation
                try {
                    if (chrome.storage?.session) {
                        const result = await chrome.storage.session.get('ledger_needs_user_interaction');

                        if (result.ledger_needs_user_interaction &&
                            result.ledger_needs_user_interaction.operation === 'setHdPath' &&
                            result.ledger_needs_user_interaction.pendingHdPath) {

                            const pendingPath = result.ledger_needs_user_interaction.pendingHdPath;
                            log.debug(`Found pending HD path change to ${pendingPath}, applying now`);

                            // Try to apply the pending HD path change now that we have permission
                            try {
                                await setHdPath(pendingPath);
                                log.debug(`Successfully applied pending HD path change to ${pendingPath}`);

                                // Clear the pending operation
                                await chrome.storage.session.remove('ledger_needs_user_interaction');
                            } catch (hdPathError) {
                                log.error('Failed to apply pending HD path change:', hdPathError);
                                setFetchError(`Failed to set HD path: ${hdPathError instanceof Error ? hdPathError.message : 'Unknown error'}`);
                                setState({ gettingAccounts: false });
                                return;
                            }
                        }
                    }
                } catch (e) {
                    log.warn('Error checking for pending HD path operations:', e);
                    // Continue with normal flow
                }
            }

            // Now proceed with the regular connection flow
            const connectionResult = await connectHardwareWallet(vendor);

            if (connectionResult === true) {
                log.debug('Successfully connected hardware keyring');

                // For Ledger, update the connection status again
                if (vendor === Devices.LEDGER && chrome.storage?.session) {
                    try {
                        await chrome.storage.session.set({
                            'ledger_connection_status': {
                                connected: true,
                                timestamp: Date.now()
                            }
                        });
                    } catch (e) {
                        log.warn('Failed to update Ledger connection status', e);
                    }
                }

                // Connection successful, proceed with getting accounts
                await getAccounts();
            } else if (typeof connectionResult === 'object' && connectionResult.needsUserGesture) {
                // This shouldn't happen since we already got WebHID permission, but handle it anyway
                log.warn('Still getting user gesture needed after WebHID permission granted');

                // Try one more direct approach for Ledger
                if (vendor === Devices.LEDGER) {
                    try {
                        log.debug('Attempting direct connection approach for Ledger');
                        await triggerWebHIDDirectly();

                        // Try connecting again
                        const retryResult = await connectHardwareWallet(vendor);

                        if (retryResult === true) {
                            log.debug('Direct connection approach succeeded');
                            await getAccounts();
                            return;
                        }
                    } catch (retryError) {
                        log.error('Direct connection approach failed:', retryError);
                    }
                }

                setFetchError('Still requiring user interaction after permission granted. Please try disconnecting and reconnecting your device.');
                setState({ gettingAccounts: false });
            } else {
                // Some other error occurred
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

    // Add this content to render the user interaction prompt
    const renderUserInteractionPrompt = () => {
        if (!needsUserInteraction) {
            return null;
        }

        // Use safe string for vendor to avoid undefined
        const vendorName = vendor || 'hardware wallet';

        return (
            <div className="py-4 flex flex-col items-center justify-center">
                <span className="text-center mb-4 font-semibold">
                    Your {vendorName} device requires interaction
                </span>
                <span className="text-center mb-4">
                    Please make sure your device is:
                </span>
                <ul className="list-disc pl-6 mb-4">
                    <li>Connected to your computer</li>
                    <li>Unlocked</li>
                    <li>Has the Ethereum application open</li>
                </ul>
                <ButtonWithLoading
                    onClick={handleUserInitiatedConnection}
                    disabled={state.gettingAccounts}
                    type="button"
                    label={`Connect to ${vendorName}`}
                />
            </div>
        );
    };

    return (
        <HardwareWalletSetupLayout
            title="Select Accounts"
            subtitle="Select which account you would like to import."
            buttons={
                <>
                    <ButtonWithLoading
                        label="Back"
                        buttonClass={classnames(Classes.liteButton, "h-14")}
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
                        buttonClass={classnames(Classes.button, "h-14")}
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
                            <button
                                onClick={handleRetryFetch}
                                className="bg-primary-blue-default hover:bg-primary-blue-hover text-white font-medium py-2 px-4 rounded-md"
                            >
                                Retry
                            </button>
                            {vendor === Devices.LEDGER && (
                                <div className="mt-4 text-xs text-gray-500 max-w-md text-center">
                                    <p className="font-medium mb-1">Troubleshooting Tips:</p>
                                    <ul className="list-disc pl-5 text-left">
                                        <li>Make sure the Ethereum app is open on your Ledger</li>
                                        <li>Check that your Ledger is unlocked</li>
                                        <li>Try changing the HD path in Advanced Settings below</li>
                                        <li>Ensure your Ledger firmware is up to date</li>
                                    </ul>
                                </div>
                            )}
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
                            onChangePage={(page) =>
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
                            onChangePage={(page) =>
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
                            className={classnames(
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
        </HardwareWalletSetupLayout>
    )
}

export default HardwareWalletAccountsPage
