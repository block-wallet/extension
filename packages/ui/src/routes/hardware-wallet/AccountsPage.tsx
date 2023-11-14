import { useCallback, useEffect, useMemo, useReducer, useState } from "react"

import LoadingOverlay from "../../components/loading/LoadingOverlay"
import {
    getHardwareWalletAccounts,
    importHardwareWalletAccounts,
    getHardwareWalletHDPath,
    setHardwareWalletHDPath,
    selectAccount,
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

const HardwareWalletAccountsPage = () => {
    const history = useOnMountHistory()!
    const [enabledPagination, setEnabledPagination] = useState(true)
    const vendor = history.location.state.vendor as Devices
    const isKeystoneConnected = history.location.state.isKeystoneConnected
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
        run(getHardwareWalletHDPath(vendor))
    }, [vendor, run])

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

    const getAccounts = useCallback(async () => {
        setState({ gettingAccounts: true })
        try {
            const accounts = await getHardwareWalletAccounts(
                vendor,
                state.currentPage,
                state.pageSize
            )
            setState({
                deviceAccounts: accounts,
                gettingAccounts: false,
            })
        } catch (e) {
            log.error(e)
            setState({ deviceNotReady: true })
        }
    }, [state.currentPage, state.pageSize, vendor])

    useEffect(() => {
        if (hdPath) {
            if (vendor === Devices.KEYSTONE) checkKeystoneAccounts()
            getAccounts()
        }
    }, [checkKeystoneAccounts, getAccounts, hdPath, vendor])

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
        } catch (e) {}
    }

    const onUpdatePageSize = (pageSize: number) => {
        setState({
            pageSize,
            currentPage: 1,
        })
    }

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
                    ) : (
                        <div className="flex items-center justify-center w-full h-full">
                            {state.gettingAccounts ? (
                                <Spinner size="48" color="black" />
                            ) : (
                                <span>
                                    Cannot fetch accounts because the device is
                                    disconnected or locked, please go back and
                                    connect it again.
                                </span>
                            )}
                        </div>
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
                        currentHDPath={
                            hdPath ||
                            HDPaths[vendor].find((p) => p.default)?.path ||
                            BIP44_PATH
                        }
                        disabled={state.gettingAccounts}
                        vendor={vendor}
                        setHDPath={updateHDPath}
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
