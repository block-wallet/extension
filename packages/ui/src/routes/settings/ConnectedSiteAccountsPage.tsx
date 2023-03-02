import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { formatUnits } from "@ethersproject/units"
import { FunctionComponent, useMemo, useState } from "react"
import { BiRadioCircleMarked } from "react-icons/bi"
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
import Icon, { IconName } from "../../components/ui/Icon"
import Dropdown from "../../components/ui/Dropdown/Dropdown"

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
            <div className="flex flex-col items-start">
                <div className="flex flex-row items-center justify-between w-full">
                    <div className="flex flex-row items-center space-x-4">
                        <div className="flex flex-row items-center justify-center w-10 h-10 rounded-full">
                            <AccountIcon
                                className="w-10 h-10"
                                fill={getAccountColor(account.address)}
                            />
                        </div>
                        <div className="flex flex-col space-y-1 cursor-default">
                            <div className="flex flex-row space-x-1">
                                <span
                                    className="text-sm font-bold text-gray-800 cursor-text"
                                    title={account.name}
                                >
                                    {formatName(account.name, 18)}{" "}
                                </span>
                                <span
                                    className="font-bold text-primary-black-default cursor-text"
                                    title={account.address}
                                >
                                    {formatHashLastChars(account.address)}
                                </span>
                            </div>
                            <span
                                className="text-xs text-gray-400"
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
                                    className="text-red-500 space-x-2 cursor-pointer flex flex-row p-2 justify-center items-center hover:bg-gray-100 hover:rounded-t-md"
                                >
                                    <Icon
                                        name={IconName.TRASH_BIN}
                                        profile="danger"
                                    />
                                    <span>Disconnect</span>
                                </Dropdown.MenuItem>
                            ) : (
                                <Dropdown.MenuItem
                                    onClick={() => {
                                        handleConnectSite(account.address)
                                    }}
                                    className="text-green-400 space-x-2 cursor-pointer flex flex-row p-2 justify-start items-center hover:bg-gray-100 hover:rounded-t-md"
                                >
                                    <BiRadioCircleMarked size={24} />
                                    <span>Connect</span>
                                </Dropdown.MenuItem>
                            )}
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
                {connected ? (
                    <div className="flex flex-row">
                        {active && (
                            <div className="mt-2 ml-14 px-1.5 py-0.5 font-bold border rounded-sm text-xs border-gray-700 bg-gray-700 text-white pointer-events-none">
                                Active
                            </div>
                        )}
                        {account.address !== selectedAddress && (
                            <button
                                className={classnames(
                                    "mt-2 px-1.5 py-0.5 font-bold border rounded-sm text-xs border-primary-blue-default text-primary-blue-default hover:bg-primary-grey-hover",
                                    active ? "ml-2" : "ml-14"
                                )}
                                onClick={() =>
                                    handleSwitchAccount(account.address)
                                }
                            >
                                Switch
                            </button>
                        )}
                    </div>
                ) : (
                    <span
                        className={classnames(
                            "mt-2 ml-14 px-1.5 py-0.5 border rounded-sm text-xs",
                            "border-red-300  text-red-300 pointer-events-none"
                        )}
                    >
                        Not connected
                    </span>
                )}
            </div>
            <ConfirmDialog
                title="Remove site connection"
                message={`Do you want to remove ${formatName(
                    account.name,
                    18
                )} connection?`}
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
        } catch {}
    }

    const handleConnectSite = async (address: string) => {
        try {
            connectedAccounts.push(address)
            updateSitePermissions(origin, connectedAccounts)
        } catch {}
    }

    const handleSwitchAccount = async (address: string) => {
        try {
            await selectAccount(address)
            history.push({
                pathname: "/",
            })
        } catch {}
    }

    return !permission ? (
        <Redirect to="/" />
    ) : (
        <PopupLayout
            header={
                <PopupHeader
                    icon={site.iconURL}
                    title={new URL(origin).hostname}
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
            <div className="flex flex-col p-6 space-y-8 text-sm text-gray-500">
                {!isSelectedAccountConnected && (
                    <div>
                        <WarningTip
                            text={"Current account is not connected"}
                            fontSize="text-xs"
                            justify="justify-start"
                        />
                    </div>
                )}
                <div className="flex flex-col space-y-2">
                    <span className="text-xs">CURRENT ACCOUNT</span>
                    <ConnectedSiteAccount
                        account={accounts[selectedAddress]}
                        active={activeAcc === selectedAddress}
                        connected={isSelectedAccountConnected}
                        handleRemoveFromSite={handleRemoveFromSite}
                        handleConnectSite={handleConnectSite}
                        handleSwitchAccount={handleSwitchAccount}
                    />
                </div>

                {connectedAccounts?.length > 0 && (
                    <div className="flex flex-col space-y-2">
                        <span className="text-xs">CONNECTED ACCOUNTS</span>
                        <div className="flex flex-col space-y-6">
                            {connectedAccounts.map(
                                (address) =>
                                    accounts[address] && (
                                        <ConnectedSiteAccount
                                            account={accounts[address]}
                                            active={activeAcc === address}
                                            key={address}
                                            handleRemoveFromSite={
                                                handleRemoveFromSite
                                            }
                                            handleConnectSite={
                                                handleConnectSite
                                            }
                                            handleSwitchAccount={
                                                handleSwitchAccount
                                            }
                                        />
                                    )
                            )}
                        </div>
                    </div>
                )}
            </div>
        </PopupLayout>
    )
}

export default ConnectedSiteAccountsPage
