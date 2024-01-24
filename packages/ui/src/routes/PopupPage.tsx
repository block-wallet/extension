import { useState } from "react"
import classnames from "classnames"
import { Link, useHistory } from "react-router-dom"
import { BiCircle } from "react-icons/bi"

// Components
import CopyTooltip from "../components/label/СopyToClipboardTooltip"
import GearIcon from "../components/icons/GearIcon"
import QRIcon from "../components/icons/QRIcon"
import NetworkSelect from "../components/input/NetworkSelect"
import ArrowHoverAnimation from "../components/icons/ArrowHoverAnimation"
import ErrorDialog from "../components/dialog/ErrorDialog"
import AccountIcon from "../components/icons/AccountIcon"
import ActivityAssetsView from "../components/home/ActivityAssetsView"
import GenericTooltip from "../components/label/GenericTooltip"
import AnimatedIcon, { AnimatedIconName } from "../components/AnimatedIcon"
import Tooltip from "../components/label/Tooltip"

// Utils
import { formatHash, formatName } from "../util/formatAccount"
import { getAccountColor } from "../util/getAccountColor"
import { HiOutlineExclamationCircle } from "react-icons/hi"

// Context
import { useBlankState } from "../context/background/backgroundHooks"
import { useSelectedAccount } from "../context/hooks/useSelectedAccount"
import { useSelectedNetwork } from "../context/hooks/useSelectedNetwork"
import { session } from "../context/setup"
import { useConnectedSite } from "../context/hooks/useConnectedSite"

// Utils
import { useSelectedAddressWithChainIdChecksum } from "../util/hooks/useSelectedAddressWithChainIdChecksum"

// Assets
import TokenSummary from "../components/token/TokenSummary"
import GasPricesInfo from "../components/gas/GasPricesInfo"
import DoubleArrowHoverAnimation from "../components/icons/DoubleArrowHoverAnimation"
import TransparentOverlay from "../components/loading/TransparentOverlay"
import PopupLayout from "../components/popup/PopupLayout"
import PopupHeader from "../components/popup/PopupHeader"
import Icon, { IconName } from "../components/ui/Icon"
import useNetWorthBalance from "../context/hooks/useNetWorthBalance"
import { AiFillInfoCircle } from "react-icons/ai"
import ProviderStatus from "../components/chain/ProviderStatus"
import { useHotkeys } from "react-hotkeys-hook"
import { componentsHotkeys } from "../util/hotkeys"
import { generateExplorerLink } from "../util/getExplorer"
import { setUserSettings } from "../context/commActions"

import browser from "webextension-polyfill"

const AccountDisplay = () => {
    const accountAddress = useSelectedAddressWithChainIdChecksum()
    const account = useSelectedAccount()
    const [copied, setCopied] = useState(false)
    const copy = async () => {
        await navigator.clipboard.writeText(accountAddress)
        setCopied(true)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setCopied(false)
    }
    return (
        <button
            type="button"
            className="relative flex flex-col group"
            onClick={copy}
        >
            <span
                className="text-sm font-semibold truncate max-w-[96px] text-left"
                data-testid="account-name"
                title={account.name}
            >
                {formatName(account.name, 18)}
            </span>
            <span className="text-[11px] text-primary-grey-dark truncate">
                {formatHash(accountAddress)}
            </span>
            <CopyTooltip copied={copied} />
        </button>
    )
}

const DAppConnection = () => {
    const dAppConnected = useConnectedSite()
    const history = useHistory()!
    return (
        <GenericTooltip
            bottom
            className="p-2 w-150 overflow-auto -m-4 transition delay-300 hover:delay-0 ease-in-out"
            content={
                <div>
                    <p className="w-100 text-center">
                        {dAppConnected === "connected" ? (
                            <span>You are connected to the open site</span>
                        ) : (
                            <span>You are not connected to the open site</span>
                        )}
                    </p>
                </div>
            }
        >
            <div
                onClick={() => {
                    if (dAppConnected !== "not-connected") {
                        history.push({
                            pathname:
                                "/accounts/menu/connectedSites/accountList",
                            state: {
                                origin: session?.origin,
                                fromRoot: true,
                            },
                        })
                    }
                }}
                className={classnames(
                    "relative flex flex-row items-center py-1  text-primary-grey-dark rounded-md group border-primary-200  text-xs cursor-pointer",
                    dAppConnected === "connected" &&
                        "pl-2 pr-1 bg-green-100 hover:border-green-300",
                    dAppConnected === "connected-warning" &&
                        "pl-2 pr-1 bg-yellow-100 hover:border-yellow-300",
                    dAppConnected === "not-connected" && "pointer-events-none"
                )}
            >
                {dAppConnected === "connected" && (
                    <span className="relative inline-flex rounded-full h-2 w-2 mr-2 animate-pulse bg-green-400 pointer-events-none"></span>
                )}

                {dAppConnected === "connected-warning" && (
                    <HiOutlineExclamationCircle
                        size={16}
                        className="mr-1 text-yellow-600"
                    />
                )}

                {dAppConnected === "not-connected" && (
                    <BiCircle className="mr-1 w-2" />
                )}

                <span
                    className={classnames(
                        "mr-1 pointer-events-none",
                        dAppConnected === "connected" &&
                            "text-secondary-green-default",
                        dAppConnected === "connected-warning" &&
                            "text-yellow-600"
                    )}
                >
                    {dAppConnected === "not-connected"
                        ? "Not connected"
                        : "Connected"}
                </span>
            </div>
        </GenericTooltip>
    )
}

const PopupPage = () => {
    const error = (useHistory().location.state as { error: string })?.error
    const state = useBlankState()!
    const history = useHistory()
    const {
        displayNetWorth,
        netWorth,
        nativeTokenBalance,
        nativeTokenBalanceRounded,
        nativeCurrencyAmount,
    } = useNetWorthBalance()
    const {
        isSendEnabled,
        isSwapEnabled,
        isBridgeEnabled,
        showGasLevels,
        isOnrampEnabled,
    } = useSelectedNetwork()

    const checksumAddress = useSelectedAddressWithChainIdChecksum()
    const [hasErrorDialog, setHasErrorDialog] = useState(!!error)

    const isLoading = state.isNetworkChanging

    const disabledActions = !isSendEnabled || !state.isUserNetworkOnline
    const hotkeysPermissions = {
        "/home/alt/s": isSendEnabled, //Send
        "/home/alt/w": isSwapEnabled, //Swap
        "/home/alt/b": isBridgeEnabled, //Bridge
        "/home/alt/g": showGasLevels,
        "/home/alt/u": isOnrampEnabled,
    }

    const popupPageHotkeys = componentsHotkeys.PopupPage
    useHotkeys(popupPageHotkeys, () => {
        if (!state.hotkeysEnabled) return

        browser.tabs.create({
            url: generateExplorerLink(
                state.availableNetworks,
                state.selectedNetwork,
                checksumAddress,
                "address"
            ),
        })
    })

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title=""
                    close={false}
                    backButton={false}
                    permissions={hotkeysPermissions}
                    className="justify-between w-full"
                >
                    {state.isNetworkChanging && <TransparentOverlay />}
                    <div className="flex flex-row items-center space-x-3">
                        <div className="relative flex flex-col items-start group">
                            <Link
                                to="/accounts"
                                className="transition duration-300"
                                draggable={false}
                                data-testid="navigate-account-link"
                            >
                                <AccountIcon
                                    className="w-8 h-8 transition-transform duration-200 ease-in transform hover:rotate-180"
                                    fill={getAccountColor(checksumAddress)}
                                />
                            </Link>
                            <Tooltip
                                className="pointer-events-none absolute bottom-0 -mb-2 transform !translate-x-0 !translate-y-full p-2 rounded-md text-xs font-medium bg-primary-black-default text-white"
                                content={
                                    <>
                                        <span>My Accounts</span>
                                    </>
                                }
                            />
                        </div>
                        <div className="flex flex-row items-center space-x-1">
                            <AccountDisplay />
                            <div className="flex relative group">
                                <Link
                                    to="/accounts/menu/receive"
                                    draggable={false}
                                    onClick={(e) => {
                                        e.preventDefault()

                                        history.push("/accounts/menu/receive")
                                    }}
                                    className="p-2 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                                >
                                    <QRIcon />
                                </Link>
                                <Tooltip
                                    className="pointer-events-none absolute bottom-0 -mb-2 transform !translate-x-3 !translate-y-full p-2 rounded-md text-xs font-medium bg-primary-black-default text-white"
                                    content={
                                        <>
                                            <span>Receive funds</span>
                                        </>
                                    }
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-row items-center -mr-1 space-x-2">
                        <GasPricesInfo />
                        <Link
                            to="/settings"
                            draggable={false}
                            onClick={(e) => {
                                e.preventDefault()

                                history.push("/settings")
                            }}
                            className="p-2 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                        >
                            <GearIcon />
                        </Link>
                    </div>
                </PopupHeader>
            }
            hotkeysPermissions={hotkeysPermissions}
        >
            <ErrorDialog
                title="Error!"
                message={error}
                open={hasErrorDialog}
                onClickOutside={() => {
                    setHasErrorDialog(false)
                }}
                onDone={() => setHasErrorDialog(false)}
            />
            <div className="flex flex-col items-start flex-1 w-full h-0 max-h-screen p-6 pt-4 space-y-2  hide-scroll">
                <div className="w-full">
                    <ProviderStatus onHomepage />
                    <div className="flex flex-row items-start w-full justify-between pt-1 pb-1">
                        <GenericTooltip
                            bottom
                            disabled={!state.isImportingDeposits}
                            content={
                                <p className="w-40 text-center">
                                    Please wait until deposits are done loading
                                    to change networks. This can take up to 15
                                    minutes.
                                </p>
                            }
                        >
                            <NetworkSelect />
                        </GenericTooltip>
                        <DAppConnection />
                    </div>
                    <TokenSummary className="p-4">
                        <TokenSummary.Balances className="!space-y-0">
                            <TokenSummary.TokenBalance
                                title={
                                    displayNetWorth
                                        ? netWorth
                                        : nativeTokenBalance
                                }
                            >
                                {displayNetWorth
                                    ? netWorth
                                    : nativeTokenBalanceRounded}
                            </TokenSummary.TokenBalance>

                            <TokenSummary.ExchangeRateBalance className="flex items-center text-xs">
                                <div className="group relative">
                                    <a
                                        href="https://blockwallet.io/docs/net-worth"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="contents"
                                    >
                                        <AiFillInfoCircle
                                            size={23}
                                            className="pr-2 text-primary-grey-dark cursor-pointer hover:text-primary-blue-default"
                                        />

                                        <Tooltip
                                            content={
                                                <div className="flex flex-col font-normal items-start text-xs text-white-500">
                                                    <div className="flex flex-row items-end space-x-7">
                                                        {displayNetWorth ? (
                                                            <span>
                                                                Your Net Worth
                                                                is the summed{" "}
                                                                {state.nativeCurrency.toUpperCase()}{" "}
                                                                value
                                                                <br /> of all
                                                                assets in your
                                                                asset list.{" "}
                                                            </span>
                                                        ) : (
                                                            <span>
                                                                Native token
                                                                balance for{" "}
                                                                <br /> the
                                                                current network.
                                                            </span>
                                                        )}{" "}
                                                    </div>
                                                    <div className="flex flex-row items-end space-x-4">
                                                        <span>
                                                            Click on this icon
                                                            to learn more.
                                                        </span>{" "}
                                                    </div>
                                                </div>
                                            }
                                            className="!-mb-4"
                                        />
                                    </a>
                                </div>
                                {displayNetWorth
                                    ? "Net Worth"
                                    : nativeCurrencyAmount}
                                <div
                                    title={`Switch to ${
                                        displayNetWorth
                                            ? "Native Token"
                                            : "Net Worth"
                                    }`}
                                    className="pl-2 text-primary-grey-dark cursor-pointer hover:text-primary-blue-default"
                                    onClick={() => {
                                        setUserSettings({
                                            ...state.settings,
                                            displayNetWorth: !displayNetWorth,
                                        })
                                    }}
                                >
                                    <Icon name={IconName.SWITCH} size="sm" />
                                </div>
                            </TokenSummary.ExchangeRateBalance>
                        </TokenSummary.Balances>
                        <TokenSummary.Actions>
                            <Link
                                to="/send"
                                draggable={false}
                                className={classnames(
                                    "flex flex-col items-center space-y-2 group",
                                    disabledActions && "pointer-events-none"
                                )}
                            >
                                <div
                                    className={classnames(
                                        "w-8 h-8 overflow-hidden transition duration-300 rounded-full group-hover:opacity-75",
                                        disabledActions
                                            ? "bg-gray-300"
                                            : "bg-primary-blue-default"
                                    )}
                                    style={{ transform: "scaleY(-1)" }}
                                >
                                    {isLoading ? (
                                        <div className="flex flex-row items-center justify-center w-full h-full">
                                            <AnimatedIcon
                                                icon={
                                                    AnimatedIconName.BlueCircleLoadingSkeleton
                                                }
                                                className="w-4 h-4 pointer-events-none"
                                            />
                                        </div>
                                    ) : (
                                        <ArrowHoverAnimation />
                                    )}
                                </div>
                                <span className="text-[13px] font-medium">
                                    Send
                                </span>
                            </Link>
                            {isOnrampEnabled && (
                                <Link
                                    to="/buy"
                                    draggable={false}
                                    className={classnames(
                                        "flex flex-col items-center space-y-2 group",
                                        disabledActions && "pointer-events-none"
                                    )}
                                >
                                    <div
                                        className={classnames(
                                            "w-8 h-8 overflow-hidden transition duration-300 rounded-full group-hover:opacity-75",
                                            disabledActions
                                                ? "bg-gray-300"
                                                : "bg-primary-blue-default"
                                        )}
                                    >
                                        {isLoading ? (
                                            <div className="flex flex-row items-center justify-center w-full h-full">
                                                <AnimatedIcon
                                                    icon={
                                                        AnimatedIconName.BlueCircleLoadingSkeleton
                                                    }
                                                    className="w-4 h-4 pointer-events-none"
                                                />
                                            </div>
                                        ) : (
                                            <AnimatedIcon
                                                icon={AnimatedIconName.Wallet}
                                                className="cursor-pointer"
                                            />
                                        )}
                                    </div>
                                    <span className="text-[13px] font-medium">
                                        Buy
                                    </span>
                                </Link>
                            )}
                            {isSwapEnabled && (
                                <Link
                                    to="/swap"
                                    draggable={false}
                                    className={classnames(
                                        "flex flex-col items-center space-y-2 group",
                                        disabledActions && "pointer-events-none"
                                    )}
                                >
                                    <div
                                        className={classnames(
                                            "w-8 h-8 overflow-hidden transition duration-300 rounded-full group-hover:opacity-75",
                                            disabledActions
                                                ? "bg-gray-300"
                                                : "bg-primary-blue-default"
                                        )}
                                        style={{ transform: "scaleY(-1)" }}
                                    >
                                        {isLoading ? (
                                            <div className="flex flex-row items-center justify-center w-full h-full">
                                                <AnimatedIcon
                                                    icon={
                                                        AnimatedIconName.BlueCircleLoadingSkeleton
                                                    }
                                                    className="w-4 h-4 pointer-events-none rotate-180"
                                                />
                                            </div>
                                        ) : (
                                            <DoubleArrowHoverAnimation />
                                        )}
                                    </div>
                                    <span className="text-[13px] font-medium">
                                        Swap
                                    </span>
                                </Link>
                            )}
                            {isBridgeEnabled && (
                                <Link
                                    to="/bridge"
                                    draggable={false}
                                    className={classnames(
                                        "flex flex-col items-center space-y-2 group",
                                        disabledActions && "pointer-events-none"
                                    )}
                                >
                                    <div
                                        className={classnames(
                                            "w-8 h-8 overflow-hidden transition duration-300 rounded-full group-hover:opacity-75",
                                            disabledActions
                                                ? "bg-gray-300"
                                                : "bg-primary-blue-default"
                                        )}
                                        style={{ transform: "scaleY(-1)" }}
                                    >
                                        {isLoading ? (
                                            <div className="flex flex-row items-center justify-center w-full h-full">
                                                <AnimatedIcon
                                                    icon={
                                                        AnimatedIconName.BlueCircleLoadingSkeleton
                                                    }
                                                    className="w-4 h-4 pointer-events-none"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                {disabledActions ? (
                                                    <Icon
                                                        name={
                                                            IconName.DISABLED_BRIDGE
                                                        }
                                                        size="xl"
                                                    />
                                                ) : (
                                                    <AnimatedIcon
                                                        icon={
                                                            AnimatedIconName.Bridge
                                                        }
                                                        className="cursor-pointer bg-primary-blue-default"
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <span className="text-[13px] font-medium">
                                        Bridge
                                    </span>
                                </Link>
                            )}
                        </TokenSummary.Actions>
                    </TokenSummary>
                    <ActivityAssetsView initialTab={state.popupTab} />
                </div>
            </div>
        </PopupLayout>
    )
}

export default PopupPage
