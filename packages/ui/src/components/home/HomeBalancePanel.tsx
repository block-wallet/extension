import { useBlankState } from "../../context/background/backgroundHooks"
import { useExchangeRatesState } from "../../context/background/useExchangeRatesState"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useTokensList } from "../../context/hooks/useTokensList"
import { formatRounded } from "../../util/formatRounded"
import TokenSummary from "../token/TokenSummary"
import { formatUnits } from "ethers/lib/utils"
import { Link } from "react-router-dom"
import classnames from "classnames"
import AnimatedIcon, { AnimatedIconName } from "../AnimatedIcon"
import DoubleArrowHoverAnimation from "../icons/DoubleArrowHoverAnimation"
import ArrowHoverAnimation from "../icons/ArrowHoverAnimation"
import useCurrencyFromatter from "../../util/hooks/useCurrencyFormatter"
import Icon, { IconName } from "../ui/Icon"

const LoadingBlueIcon = () => {
    return (
        <div className="flex flex-row items-center justify-center w-full h-full">
            <AnimatedIcon
                icon={AnimatedIconName.BlueCircleLoadingSkeleton}
                className="w-4 h-4 pointer-events-none rotate-180"
            />
        </div>
    )
}
const HomeBalancePanel = () => {
    const { isNetworkChanging, isUserNetworkOnline } = useBlankState()!
    const formatter = useCurrencyFromatter()
    const {
        state: { networkNativeCurrency, isRatesChangingAfterNetworkChange },
    } = useExchangeRatesState()
    const { nativeToken } = useTokensList()
    const { nativeCurrency, isSendEnabled, isSwapEnabled, isBridgeEnabled } =
        useSelectedNetwork()

    const disabledActions = !isSendEnabled || !isUserNetworkOnline

    return (
        <div className="px-6">
            <TokenSummary className="p-4">
                <TokenSummary.Balances>
                    <TokenSummary.TokenBalance
                        isLoading={isNetworkChanging}
                        title={
                            formatUnits(
                                nativeToken.balance || "0",
                                nativeCurrency.decimals
                            ) + ` ${nativeCurrency.symbol}`
                        }
                    >
                        {formatRounded(
                            formatUnits(
                                nativeToken.balance || "0",
                                nativeCurrency.decimals
                            ),
                            5
                        )}{" "}
                        {nativeCurrency.symbol}
                    </TokenSummary.TokenBalance>
                    <TokenSummary.ExchangeRateBalance
                        isLoading={
                            isNetworkChanging ||
                            isRatesChangingAfterNetworkChange
                        }
                    >
                        {formatter.format(
                            nativeToken.balance,
                            networkNativeCurrency.symbol,
                            nativeCurrency.decimals,
                            true
                        )}
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
                                    : "bg-primary-300"
                            )}
                            style={{ transform: "scaleY(-1)" }}
                        >
                            {isNetworkChanging ? (
                                <LoadingBlueIcon />
                            ) : (
                                <ArrowHoverAnimation />
                            )}
                        </div>
                        <span className="text-xs font-medium">Send</span>
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
                                        : "bg-primary-300"
                                )}
                                style={{ transform: "scaleY(-1)" }}
                            >
                                {isNetworkChanging ? (
                                    <LoadingBlueIcon />
                                ) : (
                                    <DoubleArrowHoverAnimation />
                                )}
                            </div>
                            <span className="text-xs font-medium">Swap</span>
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
                                        : "bg-primary-300"
                                )}
                                style={{ transform: "scaleY(-1)" }}
                            >
                                {isNetworkChanging ? (
                                    <LoadingBlueIcon />
                                ) : (
                                    <>
                                        {disabledActions ? (
                                            <Icon
                                                name={IconName.DISABLED_BRIDGE}
                                                size="xl"
                                            />
                                        ) : (
                                            <AnimatedIcon
                                                icon={AnimatedIconName.Bridge}
                                                className="cursor-pointer"
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                            <span className="text-xs font-medium">Bridge</span>
                        </Link>
                    )}
                </TokenSummary.Actions>
            </TokenSummary>
        </div>
    )
}

export default HomeBalancePanel
