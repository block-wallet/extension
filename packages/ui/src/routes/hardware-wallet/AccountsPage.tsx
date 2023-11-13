import {
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from "react"

import LoadingOverlay from "../../components/loading/LoadingOverlay"
import {
    getAccountBalance,
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
import { getAccountColor } from "../../util/getAccountColor"
import { formatHash } from "../../util/formatAccount"
import { ViewOnExplorerButton } from "../../components/button/ViewOnExplorerButtons"
import { formatUnits } from "@ethersproject/units"
import { useTokensList } from "../../context/hooks/useTokensList"
import { formatRounded } from "../../util/formatRounded"

// Assets & icons
import AccountIcon from "../../components/icons/AccountIcon"
import EyeRevealIcon from "../../components/icons/EyeRevealIcon"
import { mergeReducer } from "../../util/reducerUtils"
import { useBlankState } from "../../context/background/backgroundHooks"
import { BIP44_PATH, Devices, HDPaths } from "../../context/commTypes"
import Spinner from "../../components/spinner/Spinner"
import log from "loglevel"
import { useOnClickOutside } from "../../util/useOnClickOutside"
import FullScreenDialog from "../../components/dialog/FullScreenDialog"
import CloseIcon from "../../components/icons/CloseIcon"
import Divider from "../../components/Divider"
import useAsyncInvoke, { Status } from "../../util/hooks/useAsyncInvoke"
import PaginationControls from "../../components/ui/Pagination/PaginationControls"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import { BigNumber } from "@ethersproject/bignumber"
import Icon, { IconName } from "../../components/ui/Icon"
import { AiFillInfoCircle } from "react-icons/ai"
import Tooltip from "../../components/label/Tooltip"
import { LINKS } from "../../util/constants"

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
            getAccounts()
        }
    }, [getAccounts, hdPath])

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

                <div className="flex w-full justify-between pt-6 items-center pl-2 space-x-2">
                    <div className="space-x-4 flex items-center max-h-10">
                        <span className="text-primary-grey-dark">Show:</span>
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
                        onChangePage={(page) => setState({ currentPage: page })}
                        pages={6}
                    />
                </div>
                {vendor !== Devices.KEYSTONE && (
                    <AdvancedSettings
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
            </div>
        </HardwareWalletSetupLayout>
    )
}

const HardwareWalletAccount = ({
    account,
    accountsBalances,
    selected = false,
    disabled = false,
    onChange,
    onBalanceFetched,
}: {
    account: DeviceAccountInfo
    accountsBalances: { [address in string]: BigNumber }
    selected: boolean
    disabled: boolean
    onChange: () => void
    onBalanceFetched: (address: string, balance: BigNumber) => void
}) => {
    const { nativeToken } = useTokensList()
    const [isLoading, setIsLoading] = useState(false)
    const [balance, setBalance] = useState<string>(
        account.address in accountsBalances
            ? formatRounded(
                  formatUnits(
                      accountsBalances[account.address] || "0",
                      nativeToken.token.decimals
                  ),
                  5
              ) + ` ${nativeToken.token.symbol}`
            : "*******"
    )

    const fetchBalance = async () => {
        try {
            setIsLoading(true)
            const balanceFetched = await getAccountBalance(account.address)
            onBalanceFetched(account.address, balanceFetched)
            setBalance(
                formatRounded(
                    formatUnits(
                        balanceFetched || "0",
                        nativeToken.token.decimals
                    ),
                    5
                ) + ` ${nativeToken.token.symbol}`
            )
        } catch (error) {
            setBalance("<Error fetching>")
        } finally {
            setIsLoading(false)
        }
    }
    return (
        <label
            className={classnames(
                "flex flex-row items-center space-x-4 rounded-md pl-2 py-2",
                disabled
                    ? "bg-gray-50"
                    : "cursor-pointer hover:bg-primary-grey-default"
            )}
            key={account.index}
            htmlFor={`account-${account.index}`}
        >
            <input
                type="checkbox"
                className={classnames(
                    Classes.checkboxAlt,
                    disabled && "text-gray-200 pointer-events-none"
                )}
                defaultChecked={selected || disabled}
                id={`account-${account.index}`}
                onChange={onChange}
                disabled={disabled}
            />
            <AccountIcon
                className="w-10 h-10"
                fill={getAccountColor(account.address)}
            />
            <div className="flex flex-col">
                <span className="font-semibold">{account.name}</span>
                <div className="flex space-x-2 w-full text-primary-grey-dark text-xs">
                    <span className="w-20" title={account.address}>
                        {formatHash(account.address)}
                    </span>
                    <span className="text-gray-200">|</span>
                    <div className="inline w-40">Balance: {balance}</div>
                </div>
            </div>
            <div className="flex space-x-3 items-center">
                <div
                    className={classnames(
                        "text-primary-black-default hover:text-primary-blue-default",
                        !isLoading && "cursor-pointer"
                    )}
                    title="Fetch Balance"
                    onClick={(e) => {
                        if (!isLoading) {
                            fetchBalance()
                        }
                        e.preventDefault()
                    }}
                >
                    {isLoading ? (
                        <Spinner color="black" size="16" />
                    ) : (
                        <EyeRevealIcon />
                    )}
                </div>
                <ViewOnExplorerButton
                    mode="icon"
                    hash={account.address}
                    type="address"
                />
            </div>
        </label>
    )
}

const AdvancedSettings = ({
    currentHDPath,
    vendor,
    disabled,
    setHDPath,
}: {
    currentHDPath: string
    vendor: Devices
    disabled?: boolean
    setHDPath: (hdPath: string) => void
}) => {
    const [openModal, setOpenModal] = useState(false)
    const hdPaths = HDPaths[vendor]
    const [selectedHDPath, setSelectedHDPath] = useState<string>(currentHDPath)

    useEffect(() => {
        setSelectedHDPath(currentHDPath)
    }, [currentHDPath])

    const ref = useRef<any>(null)
    useOnClickOutside(ref, () => {
        setOpenModal(false)
    })
    return (
        <>
            <div
                onClick={() => !disabled && setOpenModal(true)}
                className={classnames(
                    "w-full pl-2 pt-4 bg-white rounded-md cursor-pointer underline-offset-1 flex items-center justify-between",
                    disabled
                        ? "text-gray-200 !cursor-not-allowed"
                        : "hover:underline"
                )}
            >
                <span className="font-semibold text-base text-black">
                    Advanced Settings
                </span>
                <div>
                    <Icon
                        name={IconName.RIGHT_CHEVRON}
                        size="sm"
                        profile={disabled ? "disabled" : "default"}
                    />
                </div>
            </div>

            <FullScreenDialog open={openModal}>
                <div className="flex items-center justify-between px-6 pb-6">
                    <div className="flex flex-row items-center">
                        <span className="p-0 text-xl font-semibold text-black">
                            Advanced Settings
                        </span>
                        <div className="group relative">
                            <a
                                target="_blank"
                                href={LINKS.ARTICLES.HD_PATH}
                                rel="noreferrer"
                            >
                                <AiFillInfoCircle
                                    size={26}
                                    className="pl-2 text-primary-grey-dark cursor-pointer hover:text-primary-blue-default"
                                />
                            </a>
                            <Tooltip
                                className="!w-52 !break-word !whitespace-normal"
                                content="Click here to learn what the HD Path is and the implications of changing it."
                            />
                        </div>
                    </div>
                    <div
                        onClick={() => setOpenModal(false)}
                        className=" cursor-pointer p-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                    >
                        <CloseIcon size="12" />
                    </div>
                </div>
                <Divider />
                <div className="flex flex-col w-full space-y-6 p-6">
                    <span>
                        If you don't see the accounts you're expecting, try
                        switching the HD path.
                    </span>
                    <div className="flex flex-col space-y-2">
                        <label>HD Path</label>
                        <Select
                            onChange={setSelectedHDPath}
                            currentValue={selectedHDPath}
                        >
                            {hdPaths.map((hdPath) => (
                                <Select.Option
                                    value={hdPath.path}
                                    key={hdPath.path}
                                >
                                    {hdPath.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>
                </div>

                <div className="flex flex-col px-6">
                    <hr className="absolute left-0 border-0.5 border-primary-grey-hover w-full" />
                    <div className="flex flex-row w-full items-center pt-5 justify-between space-x-4">
                        <button
                            className={classnames(Classes.liteButton)}
                            onClick={() => setOpenModal(false)}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setHDPath(selectedHDPath)
                                setOpenModal(false)
                            }}
                            className={classnames(Classes.button)}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </FullScreenDialog>
        </>
    )
}

export default HardwareWalletAccountsPage
