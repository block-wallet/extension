import { useState } from "react"
import classnames from "classnames"
import { Link, useHistory } from "react-router-dom"
import { BiCircle } from "react-icons/bi"

// Components
import PageLayout from "../components/PageLayout"
import CopyTooltip from "../components/label/СopyToClipboardTooltip"
import GearIcon from "../components/icons/GearIcon"
import QRIcon from "../components/icons/QRIcon"
import NetworkSelect from "../components/input/NetworkSelect"
import ArrowHoverAnimation from "../components/icons/ArrowHoverAnimation"
import ErrorDialog from "../components/dialog/ErrorDialog"
import AccountIcon from "../components/icons/AccountIcon"
import ActivityAssetsView from "../components/ActivityAssetsView"
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
import Icon, { IconName } from "../components/ui/Icon"
import useNetWorthBalance from "../context/hooks/useNetWorthBalance"

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
                className="text-sm font-bold truncate max-w-[96px]"
                data-testid="account-name"
                title={account.name}
            >
                {formatName(account.name, 18)}
            </span>
            <span className="text-xs text-gray-600 truncate">
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
                    "relative flex flex-row items-center p-1 px-2 pr-1  text-gray-600 rounded-md group border-primary-200  text-xs cursor-pointer",
                    dAppConnected === "connected" &&
                        "bg-green-100 hover:border-green-300",
                    dAppConnected === "connected-warning" &&
                        "bg-yellow-100 hover:border-yellow-300",
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
                        dAppConnected === "connected" && "text-green-600",
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
    const netWorth = useNetWorthBalance()
    const { isSendEnabled, isSwapEnabled, isBridgeEnabled } =
        useSelectedNetwork()
    const checksumAddress = useSelectedAddressWithChainIdChecksum()
    const [hasErrorDialog, setHasErrorDialog] = useState(!!error)

    const isLoading =
        state.isNetworkChanging || state.isRatesChangingAfterNetworkChange

    const disabledActions = !isSendEnabled || !state.isUserNetworkOnline

    return (
        <PageLayout screen className="max-h-screen popup-layout">
            <ErrorDialog
                title="Error!"
                message={error}
                open={hasErrorDialog}
                onClickOutside={() => {
                    setHasErrorDialog(false)
                }}
                onDone={() => setHasErrorDialog(false)}
            />
            {state.isNetworkChanging && <TransparentOverlay />}
            <div
                className="absolute top-0 left-0 z-10 flex flex-col items-start w-full p-6 bg-white bg-opacity-75 border-b border-b-gray-200 popup-layout"
                style={{ backdropFilter: "blur(4px)" }}
            >
                <div className="flex flex-row items-center justify-between w-full">
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
                                className="pointer-events-none absolute bottom-0 -mb-2 transform !translate-x-0 !translate-y-full p-2 rounded-md text-xs font-bold bg-gray-900 text-white"
                                content={
                                    <>
                                        <div className="border-t-4 border-r-4 border-gray-900 absolute top-0 left-2 w-2 h-2 -mt-2.5 transform -rotate-45 -translate-x-1/2" />
                                        <span>My Accounts</span>
                                    </>
                                }
                            />
                        </div>
                        <div className="flex flex-row items-center space-x-1">
                            <AccountDisplay />
                            <Link
                                to="/accounts/menu/receive"
                                draggable={false}
                                onClick={(e) => {
                                    e.preventDefault()

                                    history.push("/accounts/menu/receive")
                                }}
                                className="p-2 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-blue-default"
                            >
                                <QRIcon />
                            </Link>
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
                            className="p-2 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-blue-default"
                        >
                            <GearIcon />
                        </Link>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-start flex-1 w-full h-0 max-h-screen p-6 pt-24 space-y-2 overflow-auto hide-scroll">
                <div className="w-full">
                    <div className="flex flex-row items-start w-full justify-between pt-1 pb-2">
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
                        <TokenSummary.Balances className="group relative">
                            <a
                                href="https://ethereum.org/en/developers/docs/gas/"
                                target="_blank"
                                rel="noreferrer"
                                className="contents"
                            >
                                <TokenSummary.TokenBalance title={netWorth}>
                                    {netWorth}
                                </TokenSummary.TokenBalance>
                                <TokenSummary.ExchangeRateBalance>
                                    Net Worth
                                </TokenSummary.ExchangeRateBalance>
                            </a>
                            <Tooltip
                                content={
                                    <div className="flex flex-col font-normal items-start text-xs text-white-500">
                                        <div className="flex flex-row items-end space-x-7">
                                            <span>
                                                Your NET worth is the summed{" "}
                                                {state.nativeCurrency.toUpperCase()}{" "}
                                                value
                                                <br /> of all assets in your
                                                asset list.
                                            </span>{" "}
                                        </div>
                                        <div className="flex flex-row items-end space-x-4">
                                            <span>Click to learn more.</span>{" "}
                                        </div>
                                    </div>
                                }
                                className="-translate-x-[0%]"
                            />
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
                                <span className="text-xs font-medium">
                                    Send
                                </span>
                            </Link>
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
                                    <span className="text-xs font-medium">
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
                                    <span className="text-xs font-medium">
                                        Bridge
                                    </span>
                                </Link>
                            )}
                        </TokenSummary.Actions>
                    </TokenSummary>
                    <ActivityAssetsView initialTab={state.popupTab} />
                </div>
            </div>
        </PageLayout>
    )
}

export default PopupPage
