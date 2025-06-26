import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { formatUnits } from "@ethersproject/units"
import { FunctionComponent, useMemo, useState } from "react"
import { Redirect } from "react-router-dom"
import AccountIcon from "../../components/icons/AccountIcon"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import ConfirmDialog from "../../components/dialog/ConfirmDialog"
import { useBlankState } from "../../context/background/backgroundHooks"
import {
    removeAccountFromSite,
    selectAccount,
    updateSitePermissions,
} from "../../context/commActions"
import {
    useOnMountHistory,
    useOnMountLocation,
} from "../../context/hooks/useOnMount"
import { classnames } from "../../styles"
import { formatNumberLength } from "../../util/formatNumberLength"
import { getAccountColor } from "../../util/getAccountColor"
import WarningTip from "../../components/label/WarningTip"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { formatHashLastChars, formatName } from "../../util/formatAccount"
import Dropdown from "../../components/ui/Dropdown/Dropdown"

// Icons
import { HiCheck, HiExclamation, HiTrash, HiPlus, HiSwitchHorizontal } from "react-icons/hi"
import { BsCircle, BsCheckCircleFill } from "react-icons/bs"

export type ConnectedSiteAccountsLocationState = {
    origin: string
    fromRoot?: boolean
}

const ConnectedSiteAccount: FunctionComponent<{
    account: AccountInfo
    active: boolean
    connected?: boolean
    handleRemoveFromSite: (address: string) => void
    handleConnectSite: (address: string) => void
    handleSwitchAccount: (address: string) => void
}> = ({
    account,
    active,
    connected = true,
    handleRemoveFromSite,
    handleConnectSite,
    handleSwitchAccount,
}) => {
        const [hasDialog, setHasDialog] = useState(false)

        const { selectedAddress, networkNativeCurrency } = useBlankState()!
        const { chainId } = useSelectedNetwork()

        return (
            <>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex flex-row items-center justify-between w-full">
                        <div className="flex flex-row items-center space-x-4 flex-1">
                            <div className="relative flex flex-row items-center justify-center w-12 h-12 rounded-full">
                                <AccountIcon
                                    className="w-12 h-12"
                                    fill={getAccountColor(account.address)}
                                />
                                {connected && (
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 dark:bg-green-400 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                                        <HiCheck className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col space-y-1 cursor-default flex-1">
                                <div className="flex flex-row items-center space-x-2">
                                    <span
                                        className="text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-text"
                                        title={account.name}
                                    >
                                        {formatName(account.name, 18)}
                                    </span>
                                    <span
                                        className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-text"
                                        title={account.address}
                                    >
                                        {formatHashLastChars(account.address)}
                                    </span>
                                </div>
                                <span
                                    className="text-xs text-gray-500 dark:text-gray-400"
                                    title={`${formatUnits(
                                        account.balances[chainId]
                                            .nativeTokenBalance || "0"
                                    )} ${networkNativeCurrency.symbol}`}
                                >
                                    {formatNumberLength(
                                        formatUnits(
                                            account.balances[chainId]
                                                .nativeTokenBalance || "0"
                                        ),
                                        10
                                    )}{" "}
                                    {networkNativeCurrency.symbol}
                                </span>
                            </div>
                        </div>

                        <Dropdown>
                            <Dropdown.Menu id="connected-sites-menu">
                                {connected ? (
                                    <Dropdown.MenuItem
                                        onClick={() => {
                                            setHasDialog(true)
                                        }}
                                        className="text-red-600 dark:text-red-400 space-x-2 cursor-pointer flex flex-row p-2 justify-center items-center hover:bg-gray-100 dark:hover:bg-gray-700 hover:rounded-t-md"
                                    >
                                        <HiTrash className="w-4 h-4" />
                                        <span>Disconnect</span>
                                    </Dropdown.MenuItem>
                                ) : (
                                    <Dropdown.MenuItem
                                        onClick={() => {
                                            handleConnectSite(account.address)
                                        }}
                                        className="text-green-600 dark:text-green-400 space-x-2 cursor-pointer flex flex-row p-2 justify-start items-center hover:bg-gray-100 dark:hover:bg-gray-700 hover:rounded-t-md"
                                    >
                                        <HiPlus className="w-4 h-4" />
                                        <span>Connect</span>
                                    </Dropdown.MenuItem>
                                )}
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>

                    {/* Status and Actions */}
                    <div className="flex flex-row items-center justify-between mt-4">
                        <div className="flex flex-row items-center space-x-2">
                            {connected ? (
                                <>
                                    {active && (
                                        <div className="px-2 py-1 font-semibold border rounded-md text-xs bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200">
                                            <div className="flex items-center space-x-1">
                                                <BsCheckCircleFill className="w-3 h-3" />
                                                <span>Active</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="px-2 py-1 font-semibold border rounded-md text-xs bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
                                        Connected
                                    </div>
                                </>
                            ) : (
                                <div className="px-2 py-1 border rounded-md text-xs bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">
                                    <div className="flex items-center space-x-1">
                                        <BsCircle className="w-3 h-3" />
                                        <span>Not connected</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {connected && account.address !== selectedAddress && (
                            <button
                                className="px-3 py-1 font-semibold border rounded-md text-xs border-primary-blue-default dark:border-primary-blue-400 text-primary-blue-default dark:text-primary-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center space-x-1"
                                onClick={() =>
                                    handleSwitchAccount(account.address)
                                }
                            >
                                <HiSwitchHorizontal className="w-3 h-3" />
                                <span>Switch</span>
                            </button>
                        )}
                    </div>
                </div>
                <ConfirmDialog
                    title="Remove Site Connection"
                    message={`Do you want to remove ${formatName(
                        account.name,
                        18
                    )}'s connection to this site? The site will no longer be able to view this account's information.`}
                    open={hasDialog}
                    onClose={() => setHasDialog(false)}
                    onConfirm={() => {
                        handleRemoveFromSite(account.address)
                    }}
                />
            </>
        )
    }

const ConnectedSiteAccountsPage = () => {
    const { accounts, selectedAddress, permissions } = useBlankState()!
    const { origin, fromRoot } =
        useOnMountLocation<ConnectedSiteAccountsLocationState>().state || {}
    const history = useOnMountHistory()
    const permission = permissions[origin]
    const site = permission?.data
    const activeAcc = permission?.activeAccount

    const connectedAccounts = useMemo(() => {
        return permission?.accounts.filter((a) => a !== selectedAddress)
    }, [permission?.accounts, selectedAddress])

    const isSelectedAccountConnected = useMemo(() => {
        return permission?.accounts.some((a) => a === selectedAddress)
    }, [permission?.accounts, selectedAddress])

    const handleRemoveFromSite = async (address: string) => {
        try {
            await removeAccountFromSite(origin, address)
            if (!permission) {
                history.push({
                    pathname: "/",
                })
            }
        } catch { }
    }

    const handleConnectSite = async (address: string) => {
        try {
            connectedAccounts.push(address)
            updateSitePermissions(origin, connectedAccounts)
        } catch { }
    }

    const handleSwitchAccount = async (address: string) => {
        try {
            await selectAccount(address)
            history.push({
                pathname: "/",
            })
        } catch { }
    }

    const hostname = origin ? new URL(origin).hostname : ""

    return !permission ? (
        <Redirect to="/" />
    ) : (
        <PopupLayout
            header={
                <PopupHeader
                    icon={site.iconURL}
                    title={hostname}
                    onBack={() => {
                        if (fromRoot) {
                            history.push("/")
                        } else {
                            history.push({
                                pathname: "/accounts/menu/connectedSites",
                                state: {
                                    fromAccountList:
                                        history.location.state?.fromAccountList,
                                },
                            })
                        }
                    }}
                ></PopupHeader>
            }
        >
            <div className="flex flex-col space-y-6 p-6 bg-white dark:bg-gray-900 min-h-full">
                {/* Warning for unconnected current account */}
                {!isSelectedAccountConnected && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
                        <div className="flex items-start space-x-3">
                            <HiExclamation className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                    Current Account Not Connected
                                </h3>
                                <p className="text-xs text-amber-800 dark:text-amber-200">
                                    Your currently selected account is not connected to this site. Connect it to enable transactions and interactions.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Current Account Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                            Current Account
                        </h3>
                    </div>
                    <ConnectedSiteAccount
                        account={accounts[selectedAddress.toLowerCase()]}
                        active={activeAcc === selectedAddress.toLowerCase()}
                        connected={isSelectedAccountConnected}
                        handleRemoveFromSite={handleRemoveFromSite}
                        handleConnectSite={handleConnectSite}
                        handleSwitchAccount={handleSwitchAccount}
                    />
                </div>

                {/* Connected Accounts Section */}
                {connectedAccounts?.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                                Connected Accounts ({connectedAccounts.length})
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {connectedAccounts.map(
                                (address) =>
                                    address.toLowerCase() !== selectedAddress && (
                                        <ConnectedSiteAccount
                                            account={accounts[address.toLowerCase()]}
                                            active={activeAcc === address.toLowerCase()}
                                            key={address}
                                            handleRemoveFromSite={handleRemoveFromSite}
                                            handleConnectSite={handleConnectSite}
                                            handleSwitchAccount={handleSwitchAccount}
                                        />
                                    )
                            )}
                        </div>
                    </div>
                )}

                {/* Information Section */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                    <div className="flex items-start space-x-3">
                        <HiCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                Account Management
                            </h3>
                            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                <li>• Only connected accounts can interact with this site</li>
                                <li>• The active account is used for new transactions</li>
                                <li>• Use "Switch" to make an account active in your wallet</li>
                                <li>• Disconnect unused accounts to improve security</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default ConnectedSiteAccountsPage
