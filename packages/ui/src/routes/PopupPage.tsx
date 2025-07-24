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
                className="text-sm font-semibold truncate max-w-[96px] text-left text-gray-900 dark:text-gray-100"
                data-testid="account-name"
                title={account.name}
            >
                {formatName(account.name, 18)}
            </span>
            <span className="text-[11px] text-gray-600 dark:text-gray-400 truncate">
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
                    "relative flex flex-row items-center py-1 text-xs cursor-pointer rounded-md group transition-all duration-200",
                    dAppConnected === "connected" &&
                    "pl-2 pr-1 bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800",
                    dAppConnected === "connected-warning" &&
                    "pl-2 pr-1 bg-yellow-100 dark:bg-yellow-900/20 hover:bg-yellow-200 dark:hover:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-800",
                    dAppConnected === "not-connected" &&
                    "text-gray-500 dark:text-gray-500 pointer-events-none"
                )}
            >
                {dAppConnected === "connected" && (
                    <span className="relative inline-flex rounded-full h-2 w-2 mr-2 animate-pulse bg-green-500 dark:bg-green-400 pointer-events-none"></span>
                )}

                {dAppConnected === "connected-warning" && (
                    <HiOutlineExclamationCircle
                        size={16}
                        className="mr-1 text-yellow-600 dark:text-yellow-400"
                    />
                )}

                {dAppConnected === "not-connected" && (
                    <BiCircle className="mr-1 w-2" />
                )}

                <span
                    className={classnames(
                        "mr-1 pointer-events-none font-medium"
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

        chrome.tabs.create({
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
                    className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm px-4"
                >
                    {state.isNetworkChanging && <TransparentOverlay />}

                    {/* Header content with equal spacing */}
                    <div className="flex flex-row items-center justify-between w-full">
                        {/* Left Section - Account */}
                        <div className="flex flex-row items-center space-x-3">
                            <div className="relative flex items-center group">
                                <Link
                                    to="/accounts"
                                    className="transition-all duration-200 hover:scale-105"
                                    draggable={false}
                                    data-testid="navigate-account-link"
                                >
                                    <AccountIcon
                                        className="w-8 h-8 transition-all duration-200 ease-in-out hover:shadow-lg rounded-full"
                                        fill={getAccountColor(checksumAddress)}
                                    />
                                </Link>
                                <Tooltip
                                    className="pointer-events-none absolute bottom-0 -mb-2 transform !translate-x-0 !translate-y-full p-2 rounded-md text-xs font-medium bg-gray-900 dark:bg-gray-800 text-white border border-gray-700 dark:border-gray-600 shadow-lg"
                                    content={<span>My Accounts</span>}
                                />
                            </div>
                            <AccountDisplay />
                        </div>

                        {/* Center Section - Tools */}
                        <div className="flex flex-row items-center space-x-3">
                            <div className="relative group">
                                <Link
                                    to="/accounts/menu/receive"
                                    draggable={false}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        history.push("/accounts/menu/receive")
                                    }}
                                    className="flex items-center justify-center w-10 h-10 transition-all duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 text-gray-600 dark:text-gray-400"
                                >
                                    <QRIcon />
                                </Link>
                                <Tooltip
                                    className="pointer-events-none absolute bottom-0 -mb-2 transform !translate-x-0 !translate-y-full p-2 rounded-md text-xs font-medium bg-gray-900 dark:bg-gray-800 text-white border border-gray-700 dark:border-gray-600 shadow-lg"
                                    content={<span>Receive</span>}
                                />
                            </div>

                            <GenericTooltip
                                bottom
                                disabled={!state.isImportingDeposits}
                                content={
                                    <p className="w-40 text-center text-xs">
                                        Please wait until deposits are done loading
                                        to change networks. This can take up to 15
                                        minutes.
                                    </p>
                                }
                            >
                                <NetworkSelect compact />
                            </GenericTooltip>
                        </div>

                        {/* Right Section - Settings */}
                        <div className="flex flex-row items-center space-x-3">
                            <GasPricesInfo />
                            <Link
                                to="/settings"
                                draggable={false}
                                onClick={(e) => {
                                    e.preventDefault()
                                    history.push("/settings")
                                }}
                                className="p-2 transition-all duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 text-gray-600 dark:text-gray-400"
                            >
                                <GearIcon />
                            </Link>
                        </div>
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
            <div className="flex flex-col items-start flex-1 w-full h-0 max-h-screen p-6 pt-5 space-y-3 hide-scroll bg-white dark:bg-gray-900">
                <div className="w-full">
                    <ProviderStatus onHomepage />
                    <div className="flex flex-row items-start w-full justify-end pt-2 pb-4">
                        <DAppConnection />
                    </div>
                    <TokenSummary className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <TokenSummary.Balances className="!space-y-1">
                            <TokenSummary.TokenBalance
                                title={
                                    displayNetWorth
                                        ? netWorth
                                        : nativeTokenBalance
                                }
                                className="text-gray-900 dark:text-gray-100 text-2xl font-bold whitespace-nowrap"
                            >
                                {displayNetWorth
                                    ? netWorth
                                    : nativeTokenBalanceRounded}
                            </TokenSummary.TokenBalance>

                            <TokenSummary.ExchangeRateBalance className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <div className="group relative">
                                    <a
                                        href="https://blockwallet.io/docs/net-worth"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="contents"
                                    >
                                        <AiFillInfoCircle
                                            size={20}
                                            className="pr-2 text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                                        />

                                        <Tooltip
                                            content={
                                                <div className="flex flex-col font-normal items-start text-xs text-white">
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
                                <span className="font-medium">
                                    {displayNetWorth
                                        ? "Net Worth"
                                        : nativeCurrencyAmount}
                                </span>
                                <div
                                    title={`Switch to ${displayNetWorth
                                        ? "Native Token"
                                        : "Net Worth"
                                        }`}
                                    className="pl-2 text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 hover:scale-110"
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
                                    "flex flex-col items-center group transition-all duration-200 hover:scale-105 w-16",
                                    disabledActions && "pointer-events-none opacity-50"
                                )}
                                style={{ height: "57px" }}
                            >
                                <div
                                    className={classnames(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 overflow-hidden",
                                        disabledActions
                                            ? "bg-gray-300 dark:bg-gray-600"
                                            : "bg-[#3742f7] hover:bg-[#2631e6] dark:bg-[#3742f7] dark:hover:bg-[#2631e6]"
                                    )}
                                    style={{ transform: "scaleY(-1)" }}
                                >
                                    {isLoading ? (
                                        <div className="flex flex-row items-center justify-center w-full h-full">
                                            <AnimatedIcon
                                                icon={
                                                    AnimatedIconName.BlueCircleLoadingSkeleton
                                                }
                                                className="w-5 h-5 pointer-events-none"
                                            />
                                        </div>
                                    ) : (
                                        <ArrowHoverAnimation />
                                    )}
                                </div>
                                <span
                                    className="text-xs font-medium mt-1 text-gray-900 dark:text-gray-100"
                                    style={{
                                        height: "21px",
                                        lineHeight: "21px"
                                    }}
                                >
                                    Send
                                </span>
                            </Link>
                            {isOnrampEnabled && (
                                <Link
                                    to="/buy"
                                    draggable={false}
                                    className={classnames(
                                        "flex flex-col items-center group transition-all duration-200 hover:scale-105 w-16",
                                        disabledActions && "pointer-events-none opacity-50"
                                    )}
                                    style={{ height: "57px" }}
                                >
                                    <div
                                        className={classnames(
                                            "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                                            disabledActions
                                                ? "bg-gray-300 dark:bg-gray-600"
                                                : "bg-[#3742f7] hover:bg-[#2631e6] dark:bg-[#3742f7] dark:hover:bg-[#2631e6]"
                                        )}
                                    >
                                        {isLoading ? (
                                            <div className="flex flex-row items-center justify-center w-full h-full">
                                                <AnimatedIcon
                                                    icon={
                                                        AnimatedIconName.BlueCircleLoadingSkeleton
                                                    }
                                                    className="w-5 h-5 pointer-events-none"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 flex items-center justify-center">
                                                <AnimatedIcon
                                                    icon={AnimatedIconName.Wallet}
                                                    className="cursor-pointer"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <span
                                        className="text-xs font-medium mt-1 text-gray-900 dark:text-gray-100"
                                        style={{
                                            height: "21px",
                                            lineHeight: "21px"
                                        }}
                                    >
                                        Buy
                                    </span>
                                </Link>
                            )}
                            {isSwapEnabled && (
                                <Link
                                    to="/swap"
                                    draggable={false}
                                    className={classnames(
                                        "flex flex-col items-center group transition-all duration-200 hover:scale-105 w-16",
                                        disabledActions && "pointer-events-none opacity-50"
                                    )}
                                    style={{ height: "57px" }}
                                >
                                    <div
                                        className={classnames(
                                            "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 overflow-hidden",
                                            disabledActions
                                                ? "bg-gray-300 dark:bg-gray-600"
                                                : "bg-[#3742f7] hover:bg-[#2631e6] dark:bg-[#3742f7] dark:hover:bg-[#2631e6]"
                                        )}
                                        style={{ transform: "scaleY(-1)" }}
                                    >
                                        {isLoading ? (
                                            <div className="flex flex-row items-center justify-center w-full h-full">
                                                <AnimatedIcon
                                                    icon={
                                                        AnimatedIconName.BlueCircleLoadingSkeleton
                                                    }
                                                    className="w-5 h-5 pointer-events-none rotate-180"
                                                />
                                            </div>
                                        ) : (
                                            <DoubleArrowHoverAnimation />
                                        )}
                                    </div>
                                    <span
                                        className="text-xs font-medium mt-1 text-gray-900 dark:text-gray-100"
                                        style={{
                                            height: "21px",
                                            lineHeight: "21px"
                                        }}
                                    >
                                        Swap
                                    </span>
                                </Link>
                            )}
                            <Link
                                to="/portfolio"
                                draggable={false}
                                className="flex flex-col items-center group transition-all duration-200 hover:scale-105 w-16"
                                style={{ height: "57px" }}
                            >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 bg-[#3742f7] hover:bg-[#2631e6] dark:bg-[#3742f7] dark:hover:bg-[#2631e6]">
                                    {isLoading ? (
                                        <div className="flex flex-row items-center justify-center w-full h-full">
                                            <AnimatedIcon
                                                icon={
                                                    AnimatedIconName.BlueCircleLoadingSkeleton
                                                }
                                                className="w-5 h-5 pointer-events-none"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 flex items-center justify-center">
                                            <AnimatedIcon
                                                icon={AnimatedIconName.PortfolioAnalytics}
                                                className="cursor-pointer"
                                            />
                                        </div>
                                    )}
                                </div>
                                <span
                                    className="text-xs font-medium mt-1 text-gray-900 dark:text-gray-100"
                                    style={{
                                        height: "21px",
                                        lineHeight: "21px"
                                    }}
                                >
                                    Portfolio
                                </span>
                            </Link>
                            {isBridgeEnabled && (
                                <Link
                                    to="/bridge"
                                    draggable={false}
                                    className={classnames(
                                        "flex flex-col items-center group transition-all duration-200 hover:scale-105 w-16",
                                        disabledActions && "pointer-events-none opacity-50"
                                    )}
                                    style={{ height: "57px" }}
                                >
                                    <div
                                        className={classnames(
                                            "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                                            disabledActions
                                                ? "bg-gray-300 dark:bg-gray-600"
                                                : "bg-[#3742f7] hover:bg-[#2631e6] dark:bg-[#3742f7] dark:hover:bg-[#2631e6]"
                                        )}
                                    >
                                        {isLoading ? (
                                            <div className="flex flex-row items-center justify-center w-full h-full">
                                                <AnimatedIcon
                                                    icon={
                                                        AnimatedIconName.BlueCircleLoadingSkeleton
                                                    }
                                                    className="w-5 h-5 pointer-events-none"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 flex items-center justify-center">
                                                {disabledActions ? (
                                                    <Icon
                                                        name={
                                                            IconName.DISABLED_BRIDGE
                                                        }
                                                        size="lg"
                                                        className="text-white"
                                                    />
                                                ) : (
                                                    <AnimatedIcon
                                                        icon={
                                                            AnimatedIconName.Bridge
                                                        }
                                                        className="cursor-pointer"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <span
                                        className="text-xs font-medium mt-1 text-gray-900 dark:text-gray-100"
                                        style={{
                                            height: "21px",
                                            lineHeight: "21px"
                                        }}
                                    >
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
