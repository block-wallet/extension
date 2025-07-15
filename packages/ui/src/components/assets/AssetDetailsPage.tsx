import { formatUnits } from "@ethersproject/units"
import { useState } from "react"
import { Link } from "react-router-dom"
import { deleteCustomToken } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { classnames } from "../../styles"
import { formatRounded } from "../../util/formatRounded"
import useCurrencyFromatter from "../../util/hooks/useCurrencyFormatter"
import useGetAssetByTokenAddress from "../../util/hooks/useGetAssetByTokenAddress"
import { useBlankState } from "../../context/background/backgroundHooks"
import { generateExplorerLink, getExplorerTitle } from "../../util/getExplorer"

import AnimatedIcon, { AnimatedIconName } from "../../components/AnimatedIcon"
import ArrowHoverAnimation from "../icons/ArrowHoverAnimation"
import openExternal from "../../assets/images/icons/open_external.svg"
import PopupHeader from "../popup/PopupHeader"
import PopupLayout from "../popup/PopupLayout"
import TokenSummary from "../token/TokenSummary"
import { themeColors, layouts, cn } from "../../styles/theme"

import log from "loglevel"
import ConfirmDialog from "../dialog/ConfirmDialog"
import { isNativeTokenAddress } from "../../util/tokenUtils"
import SuccessDialog from "../dialog/SuccessDialog"
import { formatName } from "../../util/formatAccount"
import Icon, { IconName } from "../ui/Icon"
import DoubleArrowHoverAnimation from "../icons/DoubleArrowHoverAnimation"
import ActivityAllowancesView from "./ActivityAllowancesView"
import TokenLogo from "../token/TokenLogo"

// Loading skeleton component matching the updated layout
const AssetLoadingSkeleton = () => (
    <div className="flex flex-col flex-1 w-full min-h-0">
        <div className="p-3 pb-1">
            <div className={cn(layouts.card, "w-full p-3")}>
                <div className="flex flex-col items-center space-y-4">
                    <div className={cn("w-16 h-16 rounded-full animate-pulse", themeColors.bg.tertiary)} />
                    <div className={cn("h-4 rounded w-24 animate-pulse", themeColors.bg.tertiary)} />
                    <div className={cn("h-8 rounded w-32 animate-pulse", themeColors.bg.tertiary)} />
                    <div className={cn("h-4 rounded w-20 animate-pulse", themeColors.bg.tertiary)} />
                </div>
                <div className={cn("pt-4 border-t mt-6", themeColors.border.light)}>
                    <div className="flex justify-around space-x-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex flex-col items-center space-y-2">
                                <div className={cn("w-10 h-10 rounded-xl animate-pulse", themeColors.bg.tertiary)} />
                                <div className={cn("h-3 rounded w-8 animate-pulse", themeColors.bg.tertiary)} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        <div className="flex-1 min-h-0 px-3 pb-3">
            <div className={cn(layouts.card, "w-full h-full flex flex-col overflow-hidden")}>
                <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className={cn("h-6 rounded w-32 animate-pulse", themeColors.bg.tertiary)} />
                </div>
                <div className="flex-1 p-4">
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className={cn("h-16 rounded animate-pulse", themeColors.bg.tertiary)} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
)



const AssetDetailsPage = () => {
    const state = useBlankState()!
    const history: any = useOnMountHistory()
    const address = history.location.state.address

    const { availableNetworks, selectedNetwork } = useBlankState()!

    const account = useSelectedAccount()
    const currencyFormatter = useCurrencyFromatter()
    const { isSendEnabled, isSwapEnabled, isBridgeEnabled } =
        useSelectedNetwork()
    const asset = useGetAssetByTokenAddress(address)
    const isNative = isNativeTokenAddress(address)

    const [confirmOpen, setConfirmOpen] = useState(false)
    const [isRemoving, setIsRemoving] = useState(false)
    const [successOpen, setSuccessOpen] = useState(false)

    // Show loading state while asset is being fetched
    if (!asset) {
        return (
            <PopupLayout
                header={
                    <PopupHeader
                        onBack={() => history.push("/home")}
                        title="Asset Details"
                        close={false}
                        disabled={false}
                        networkIndicator
                    />
                }
                showProviderStatus
            >
                <AssetLoadingSkeleton />
            </PopupLayout>
        )
    }

    const { token, balance } = asset
    if (!token) {
        return (
            <PopupLayout
                header={
                    <PopupHeader
                        onBack={() => history.push("/home")}
                        title="Asset Details"
                        close={false}
                        disabled={false}
                        networkIndicator
                    />
                }
                showProviderStatus
            >
                <div className="flex flex-col items-center justify-center flex-1 p-6">
                    <Icon name={IconName.EMPTY_DRAWER} size="xl" />
                    <p className={cn("mt-4 text-center", themeColors.text.secondary)}>
                        Token not found
                    </p>
                </div>
            </PopupLayout>
        )
    }

    const formattedTokenBalance = formatUnits(balance || "0", token.decimals)
    const roundedTokenBalance = formatRounded(formattedTokenBalance, 5)
    const explorerName = getExplorerTitle(availableNetworks, selectedNetwork)
    const optionsWidth = (explorerName?.length ?? 0) > 10 ? "w-44" : "w-40"

    const removeToken = async () => {
        try {
            setIsRemoving(true)
            await deleteCustomToken(token.address)
            setIsRemoving(false)
            history.push({ pathname: "/home" })
        } catch (error) {
            log.error("Error deleting token from list")
        }
    }

    const disabledActions = !isSendEnabled || !state.isUserNetworkOnline

    // Enhanced header actions with better styling
    const headerActions = !isNative ? [
        <a
            href={generateExplorerLink(
                availableNetworks,
                selectedNetwork,
                token.address,
                "address"
            )}
            target="_blank"
            rel="noopener noreferrer"
            key={1}
        >
            <div className={classnames(
                "flex items-center p-3 transition-colors duration-200",
                "hover:bg-gray-100 dark:hover:bg-gray-800 rounded-t-md",
                themeColors.text.primary,
                optionsWidth
            )}>
                <div className="flex items-center justify-center w-8 h-8 mr-3">
                    <img
                        width="16"
                        height="16"
                        src={openExternal}
                        alt={`View on ${explorerName}`}
                        className="opacity-70"
                    />
                </div>
                <span className="text-sm font-medium">View on {explorerName}</span>
            </div>
        </a>,
        <div
            key={2}
            onClick={() => setConfirmOpen(true)}
            className={classnames(
                "flex items-center p-3 transition-colors duration-200 cursor-pointer",
                "hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-md",
                "text-red-600 dark:text-red-400",
                optionsWidth
            )}
        >
            <div className="flex items-center justify-center w-8 h-8 mr-3">
                <Icon name={IconName.TRASH_BIN} profile="danger" />
            </div>
            <span className="text-sm font-medium">Remove Token</span>
        </div>
    ] : undefined

    return (
        <PopupLayout
            header={
                <PopupHeader
                    onBack={() => history.push("/home")}
                    title={`${formatName(account.name, 14)} - ${formatName(token.symbol, 12)}`}
                    close={false}
                    disabled={isRemoving}
                    networkIndicator
                    actions={headerActions}
                />
            }
            showProviderStatus
        >
            <ConfirmDialog
                title="Remove Token"
                message={`Are you sure you want to remove ${token.symbol} token from the list?`}
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={() => {
                    setSuccessOpen(true)
                    setConfirmOpen(false)
                }}
            />
            <SuccessDialog
                open={successOpen}
                title="Token Removed"
                message={`${token.symbol} token was successfully removed.`}
                onDone={() => {
                    setSuccessOpen(false)
                    removeToken()
                }}
                timeout={1000}
            />

            <div className="flex flex-col flex-1 w-full min-h-0">
                {/* Token Summary Card - minimal design for maximum activity space */}
                <div className="p-3 pb-1">
                    <div className={cn(layouts.card, "w-full p-3")}>
                        <TokenSummary>
                            <TokenSummary.Balances>
                                <div className="mb-4">
                                    <TokenLogo
                                        logo={token.logo}
                                        name={token.symbol ?? ""}
                                        filled={true}
                                        logoSize="big"
                                    />
                                </div>
                                <TokenSummary.TokenName>
                                    {token.name}
                                </TokenSummary.TokenName>
                                <TokenSummary.TokenBalance
                                    className="flex flex-row space-x-1"
                                    title={`${formattedTokenBalance} ${token.symbol}`}
                                >
                                    <span
                                        className={cn("truncate w-full max-w-xs", themeColors.text.primary)}
                                        style={{ maxWidth: "18rem" }}
                                    >
                                        {`${roundedTokenBalance} ${token.symbol}`}
                                    </span>
                                </TokenSummary.TokenBalance>
                                <TokenSummary.ExchangeRateBalance>
                                    {currencyFormatter.format(
                                        balance,
                                        token.symbol,
                                        token.decimals,
                                        isNative
                                    )}
                                </TokenSummary.ExchangeRateBalance>
                            </TokenSummary.Balances>
                        </TokenSummary>

                        {/* Action Buttons matching main page design */}
                        <div className={cn("pt-4 border-t", themeColors.border.light)}>
                            <div className="flex justify-around w-full">
                                <Link
                                    to={{
                                        pathname: "/send",
                                        state: { asset, transitionDirection: "left" },
                                    }}
                                    draggable={false}
                                    className={classnames(
                                        "flex flex-col items-center space-y-2 group transition-all duration-200 hover:scale-105",
                                        !isSendEnabled && "pointer-events-none"
                                    )}
                                >
                                    <div
                                        className={classnames(
                                            "w-10 h-10 overflow-hidden transition-all duration-200 rounded-xl shadow-md group-hover:shadow-lg",
                                            !isSendEnabled
                                                ? "bg-gray-300 dark:bg-gray-600"
                                                : "bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400"
                                        )}
                                        style={{ transform: "scaleY(-1)" }}
                                    >
                                        <ArrowHoverAnimation />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                                        Send
                                    </span>
                                </Link>

                                {isSwapEnabled && (
                                    <Link
                                        to={{
                                            pathname: "/swap",
                                            state: {
                                                fromToken: asset.token,
                                                fromTokenBalance: asset.balance,
                                                fromAssetPage: true,
                                                transitionDirection: "left",
                                            },
                                        }}
                                        draggable={false}
                                        className={classnames(
                                            "flex flex-col items-center space-y-2 group transition-all duration-200 hover:scale-105",
                                            disabledActions && "pointer-events-none"
                                        )}
                                    >
                                        <div
                                            className={classnames(
                                                "w-10 h-10 overflow-hidden transition-all duration-200 rounded-xl shadow-md group-hover:shadow-lg",
                                                disabledActions
                                                    ? "bg-gray-300 dark:bg-gray-600"
                                                    : "bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400"
                                            )}
                                            style={{ transform: "scaleY(-1)" }}
                                        >
                                            <DoubleArrowHoverAnimation />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                                            Swap
                                        </span>
                                    </Link>
                                )}

                                {isBridgeEnabled && (
                                    <Link
                                        to={{
                                            pathname: "/bridge",
                                            state: {
                                                token: asset.token,
                                                fromAssetPage: true,
                                                transitionDirection: "left",
                                            },
                                        }}
                                        draggable={false}
                                        className={classnames(
                                            "flex flex-col items-center space-y-2 group transition-all duration-200 hover:scale-105",
                                            disabledActions && "pointer-events-none"
                                        )}
                                    >
                                        <div
                                            className={classnames(
                                                "w-10 h-10 overflow-hidden transition-all duration-200 rounded-xl shadow-md group-hover:shadow-lg",
                                                disabledActions
                                                    ? "bg-gray-300 dark:bg-gray-600"
                                                    : "bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400"
                                            )}
                                            style={{ transform: "scaleY(-1)" }}
                                        >
                                            {disabledActions ? (
                                                <Icon
                                                    name={IconName.DISABLED_BRIDGE}
                                                    size="xl"
                                                />
                                            ) : (
                                                <AnimatedIcon
                                                    icon={AnimatedIconName.Bridge}
                                                    className="cursor-pointer bg-blue-600 dark:bg-blue-500"
                                                />
                                            )}
                                        </div>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                                            Bridge
                                        </span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activity & Allowances Section - maximized for content */}
                <div className="flex-1 min-h-0 px-3 pb-3">
                    <div className={cn(layouts.card, "w-full h-full flex flex-col overflow-hidden")}>
                        <ActivityAllowancesView />
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default AssetDetailsPage
