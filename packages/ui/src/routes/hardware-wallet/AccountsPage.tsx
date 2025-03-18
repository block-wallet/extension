import { useCallback, useEffect, useMemo, useReducer, useState } from "react"

import LoadingOverlay from "../../components/loading/LoadingOverlay"
import {
    getHardwareWalletAccounts,
    importHardwareWalletAccounts,
    getHardwareWalletHDPath,
    setHardwareWalletHDPath,
    selectAccount,
    connectHardwareWallet,
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

// Assets & icons
import { mergeReducer } from "../../util/reducerUtils"
import { useBlankState } from "../../context/background/backgroundHooks"
import { BIP44_PATH, Devices, HDPaths } from "../../context/commTypes"
import Spinner from "../../components/spinner/Spinner"
import log from "loglevel"
import useAsyncInvoke, { Status } from "../../util/hooks/useAsyncInvoke"
import PaginationControls from "../../components/ui/Pagination/PaginationControls"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import { BigNumber } from "@ethersproject/bignumber"
import { AccountsPageAdvancedSettings } from "../../components/hardwareWallet/AdvancedSettings"
import { HardwareWalletAccount } from "../../components/hardwareWallet/HardwareWalletAccount"

interface State {
    gettingAccounts: boolean
    selectedAccounts: DeviceAccountInfo[]
    deviceAccounts: DeviceAccountInfo[]

    pageSize: number
    currentPage: number

    // HW state
    deviceNotReady: boolean
}

const initialState: State = {
    gettingAccounts: true,
    selectedAccounts: [],
    deviceAccounts: [],
    pageSize: 5,
    currentPage: 1,
    deviceNotReady: false,
}

async function ensureKeyringInitialized(vendor: Devices): Promise<boolean> {
    if (vendor !== Devices.LEDGER) return true; // Only needed for Ledger

    log.debug("Ensuring Ledger keyring is properly initialized");

    // Try multiple initialization approaches with retry logic
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            attempts++;
            log.debug(`Initialization attempt ${attempts}/${maxAttempts}`);

            // Try to initialize the keyring in the UI context where DOM is available
            await connectHardwareWallet(vendor);
            log.debug("Ledger keyring initialization successful");
            return true;
        } catch (e) {
            log.error(`Failed to initialize Ledger keyring (attempt ${attempts}/${maxAttempts}):`, e);

            if (attempts >= maxAttempts) {
                // Last attempt - check if we have a connection status that indicates success
                try {
                    if (chrome.storage && chrome.storage.session) {
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

    // Get vendor from history state or URL params as fallback
    const getVendorFromUrlOrHistory = () => {
        // First try from history state
        if (history.location.state && history.location.state.vendor) {
            return history.location.state.vendor;
        }

        // Try from URL search params as fallback
        try {
            const searchParams = new URLSearchParams(window.location.search);
            const vendorParam = searchParams.get('vendor');
            if (vendorParam && Object.values(Devices).includes(vendorParam as Devices)) {
                return vendorParam as Devices;
            }

            // Last resort - check URL hash for vendor
            const hash = window.location.hash;
            if (hash && hash.includes('vendor=')) {
                const vendorMatch = hash.match(/vendor=([A-Z]+)/);
                if (vendorMatch && Object.values(Devices).includes(vendorMatch[1] as Devices)) {
                    return vendorMatch[1] as Devices;
                }
            }
        } catch (e) {
            console.error('Error parsing URL params:', e);
        }

        // Default to LEDGER if we can't determine the vendor
        console.warn('Could not determine vendor from history or URL, defaulting to LEDGER');
        return Devices.LEDGER;
    };

    const vendor = getVendorFromUrlOrHistory();

    // If vendor wasn't in history state, update it for future navigation
    useEffect(() => {
        if (!history.location.state || !history.location.state.vendor) {
            history.replace({
                ...history.location,
                state: { ...(history.location.state || {}), vendor }
            });
        }
    }, [history, vendor]);

    const isKeystoneConnected = history.location.state?.isKeystoneConnected

    // Added error state to track and display specific errors
    const [fetchError, setFetchError] = useState<string | null>(null);
    // Add state to track alternative path attempts
    const [isSearchingAlternativePaths, setIsSearchingAlternativePaths] = useState(false);
    const [hdPathsChecked, setHdPathsChecked] = useState<string[]>([]);

    const {
        run,
        data: hdPath,
        isLoading: isLoadingHDPath,
        setData: setHDPath,
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
                setHDPath(path);

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

            setFetchError(errorMessage);
            setState({
                gettingAccounts: false,
                deviceAccounts: []
            });
        }
    }, [state.currentPage, state.pageSize, vendor, hdPath]);

    useEffect(() => {
        if (hdPath) {
            // First ensure keyring is initialized if needed
            const initAndGetAccounts = async () => {
                if (vendor === Devices.LEDGER) {
                    // Initialize keyring in UI context first
                    const initialized = await ensureKeyringInitialized(vendor);
                    if (!initialized) {
                        setFetchError("Failed to initialize Ledger connection. Please try reconnecting your device.");
                        setState({
                            gettingAccounts: false,
                            deviceAccounts: []
                        });
                        return;
                    }
                }

                if (vendor === Devices.KEYSTONE) checkKeystoneAccounts();
                getAccounts();
            };

            initAndGetAccounts();
        }
    }, [checkKeystoneAccounts, getAccounts, hdPath, vendor]);

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
            await setHardwareWalletHDPath(vendor, hdPath)
            // Clear the state after the HD path is updated
            setState({ selectedAccounts: [], currentPage: 1 })
            setHDPath(hdPath)
        } catch (e) { }
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
        </HardwareWalletSetupLayout>
    )
}

export default HardwareWalletAccountsPage
