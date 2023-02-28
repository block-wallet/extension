import { useBlankState } from "../../context/background/backgroundHooks"
import { useExchangeRatesState } from "../../context/background/useExchangeRatesState"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useTokensList } from "../../context/hooks/useTokensList"
import { formatRounded } from "../../util/formatRounded"
import TokenSummary from "../token/TokenSummary"
import { formatUnits } from "ethers/lib/utils"
import useCurrencyFromatter from "../../util/hooks/useCurrencyFormatter"
import PanelButtons from "./PanelButtons"

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
                    <PanelButtons.Send
                        disabled={disabledActions}
                        isLoading={isNetworkChanging}
                    />
                    {isSwapEnabled && (
                        <PanelButtons.Swap
                            disabled={disabledActions}
                            isLoading={isNetworkChanging}
                        />
                    )}
                    {isBridgeEnabled && (
                        <PanelButtons.Bridge
                            disabled={disabledActions}
                            isLoading={isNetworkChanging}
                        />
                    )}
                </TokenSummary.Actions>
            </TokenSummary>
        </div>
    )
}

export default HomeBalancePanel
