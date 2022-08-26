import { useState } from "react"
import classnames from "classnames"
import { Link, useHistory } from "react-router-dom"
import { formatUnits } from "ethers/lib/utils"
import { BigNumber } from "ethers"
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

// Utils
import { formatHash, formatName } from "../util/formatAccount"
import { formatCurrency, toCurrencyAmount } from "../util/formatCurrency"
import { getAccountColor } from "../util/getAccountColor"
import { formatRounded } from "../util/formatRounded"
import { HiOutlineExclamationCircle } from "react-icons/hi"

// Context
import { useBlankState } from "../context/background/backgroundHooks"
import { useSelectedAccount } from "../context/hooks/useSelectedAccount"
import { useSelectedNetwork } from "../context/hooks/useSelectedNetwork"
import { session } from "../context/setup"
import { useConnectedSite } from "../context/hooks/useConnectedSite"
import { useTokensList } from "../context/hooks/useTokensList"

// Assets
import TokenSummary from "../components/TokenSummary"
import GasPricesInfo from "../components/gas/GasPricesInfo"
import DoubleArrowHoverAnimation from "../components/icons/DoubleArrowHoverAnimation"

const AccountDisplay = () => {
    const blankState = useBlankState()!
    const accountAddress = blankState.selectedAddress
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
            <span className="text-sm font-bold" data-testid="account-name">
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
                    "relative flex flex-row items-center p-1 px-2 pr-1  text-gray-600 rounded-md group border border-primary-200  text-xs cursor-pointer",
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
    const account = useSelectedAccount()
    const { nativeToken } = useTokensList()
    const network = useSelectedNetwork()
    const sendsEnabled = network.isSendEnabled
    const swapsEnabled = network.isSwapEnabled

    const [hasErrorDialog, setHasErrorDialog] = useState(!!error)

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
            <div
                className="absolute top-0 left-0 z-10 flex flex-col items-start w-full p-6 bg-white bg-opacity-75 border-b border-b-gray-200 popup-layout"
                style={{ backdropFilter: "blur(4px)" }}
            >
                <div className="flex flex-row items-center justify-between w-full">
                    <div className="flex flex-row items-center space-x-3">
                        <Link
                            to="/accounts"
                            className="transition duration-300"
                            draggable={false}
                            data-testid="navigate-account-link"
                        >
                            <AccountIcon
                                className="w-8 h-8 transition-transform duration-200 ease-in transform hover:rotate-180"
                                fill={getAccountColor(account?.address)}
                            />
                        </Link>
                        <div className="flex flex-row items-center space-x-1">
                            <AccountDisplay />
                            <Link
                                to="/accounts/menu/receive"
                                draggable={false}
                                onClick={(e) => {
                                    e.preventDefault()

                                    history.push("/accounts/menu/receive")
                                }}
                                className="p-2 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
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
                            className="p-2 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
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
                    <TokenSummary>
                        <TokenSummary.Balances>
                            <TokenSummary.TokenBalance
                                title={
                                    formatUnits(
                                        nativeToken.balance || "0",
                                        network.nativeCurrency.decimals
                                    ) + ` ${network.nativeCurrency.symbol}`
                                }
                            >
                                {formatRounded(
                                    formatUnits(
                                        nativeToken.balance || "0",
                                        network.nativeCurrency.decimals
                                    ),
                                    5
                                )}{" "}
                                {network.nativeCurrency.symbol}
                            </TokenSummary.TokenBalance>
                            <TokenSummary.ExchangeRateBalance>
                                {formatCurrency(
                                    toCurrencyAmount(
                                        nativeToken.balance ||
                                            BigNumber.from(0),
                                        state.exchangeRates[
                                            state.networkNativeCurrency.symbol
                                        ],
                                        network.nativeCurrency.decimals
                                    ),
                                    {
                                        currency: state.nativeCurrency,
                                        locale_info: state.localeInfo,
                                        returnNonBreakingSpace: true,
                                        showSymbol: true,
                                    }
                                )}
                            </TokenSummary.ExchangeRateBalance>
                        </TokenSummary.Balances>
                        <TokenSummary.Actions>
                            <Link
                                to="/send"
                                draggable={false}
                                className={classnames(
                                    "flex flex-col items-center space-y-2 group",
                                    !network.isSendEnabled &&
                                        "pointer-events-none"
                                )}
                            >
                                <div
                                    className={classnames(
                                        "w-8 h-8 overflow-hidden transition duration-300 rounded-full group-hover:opacity-75",
                                        !network.isSendEnabled
                                            ? "bg-gray-300"
                                            : "bg-primary-300"
                                    )}
                                    style={{ transform: "scaleY(-1)" }}
                                >
                                    <ArrowHoverAnimation />
                                </div>
                                <span className="text-xs font-medium">
                                    Send
                                </span>
                            </Link>
                            {swapsEnabled && (
                                <Link
                                    to="/swap"
                                    draggable={false}
                                    className={classnames(
                                        "flex flex-col items-center space-y-2 group",
                                        (!sendsEnabled ||
                                            !state.isUserNetworkOnline) &&
                                            "pointer-events-none"
                                    )}
                                >
                                    <div
                                        className={classnames(
                                            "w-8 h-8 overflow-hidden transition duration-300 rounded-full group-hover:opacity-75",
                                            !sendsEnabled ||
                                                !state.isUserNetworkOnline
                                                ? "bg-gray-300"
                                                : "bg-primary-300"
                                        )}
                                        style={{ transform: "scaleY(-1)" }}
                                    >
                                        <DoubleArrowHoverAnimation />
                                    </div>
                                    <span className="text-xs font-medium">
                                        Swap
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
