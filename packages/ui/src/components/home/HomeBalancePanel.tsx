import { BigNumber } from "ethers"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useExchangeRatesState } from "../../context/background/useExchangeRatesState"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useTokensList } from "../../context/hooks/useTokensList"
import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import { formatRounded } from "../../util/formatRounded"
import TokenSummary from "../token/TokenSummary"
import { formatUnits } from "ethers/lib/utils"
import { Link } from "react-router-dom"
import classnames from "classnames"
import AnimatedIcon, { AnimatedIconName } from "../AnimatedIcon"
import DoubleArrowHoverAnimation from "../icons/DoubleArrowHoverAnimation"
import ArrowHoverAnimation from "../icons/ArrowHoverAnimation"

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
    const state = useBlankState()!
    const {
        state: { exchangeRates, networkNativeCurrency },
    } = useExchangeRatesState()
    const { nativeToken } = useTokensList()
    const { nativeCurrency, isSendEnabled, isSwapEnabled, isBridgeEnabled } =
        useSelectedNetwork()

    const isLoading =
        state.isNetworkChanging || state.isRatesChangingAfterNetworkChange
    return (
        <TokenSummary>
            <TokenSummary.Balances>
                <TokenSummary.TokenBalance
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
                <TokenSummary.ExchangeRateBalance>
                    {formatCurrency(
                        toCurrencyAmount(
                            nativeToken.balance || BigNumber.from(0),
                            exchangeRates[networkNativeCurrency.symbol],
                            nativeCurrency.decimals
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
                        !isSendEnabled && "pointer-events-none"
                    )}
                >
                    <div
                        className={classnames(
                            "w-8 h-8 overflow-hidden transition duration-300 rounded-full group-hover:opacity-75",
                            !isSendEnabled ? "bg-gray-300" : "bg-primary-300"
                        )}
                        style={{ transform: "scaleY(-1)" }}
                    >
                        {isLoading ? (
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
                            (!isSendEnabled || !state.isUserNetworkOnline) &&
                                "pointer-events-none"
                        )}
                    >
                        <div
                            className={classnames(
                                "w-8 h-8 overflow-hidden transition duration-300 rounded-full group-hover:opacity-75",
                                !isSendEnabled || !state.isUserNetworkOnline
                                    ? "bg-gray-300"
                                    : "bg-primary-300"
                            )}
                            style={{ transform: "scaleY(-1)" }}
                        >
                            {isLoading ? (
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
                            (!isBridgeEnabled || !state.isUserNetworkOnline) &&
                                "pointer-events-none"
                        )}
                    >
                        <div
                            className={classnames(
                                "w-8 h-8 overflow-hidden transition duration-300 rounded-full group-hover:opacity-75",
                                !isBridgeEnabled || !state.isUserNetworkOnline
                                    ? "bg-gray-300"
                                    : "bg-primary-300"
                            )}
                            style={{ transform: "scaleY(-1)" }}
                        >
                            {isLoading ? (
                                <LoadingBlueIcon />
                            ) : (
                                <AnimatedIcon
                                    icon={AnimatedIconName.Bridge}
                                    className="cursor-pointer"
                                />
                            )}
                        </div>
                        <span className="text-xs font-medium">Bridge</span>
                    </Link>
                )}
            </TokenSummary.Actions>
        </TokenSummary>
    )
}

export default HomeBalancePanel
