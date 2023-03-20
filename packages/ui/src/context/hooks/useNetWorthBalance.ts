import { useBlankState } from "../background/backgroundHooks"
import { useTokensList } from "./useTokensList"

import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"

const useNetWorthBalance = () => {
    const state = useBlankState()!
    const assets = useTokensList()

    const tokenBalances = assets.currentNetworkTokens

    const { token: nativeToken, balance: nativeTokenBalance } =
        assets.nativeToken

    let netWorth = toCurrencyAmount(
        nativeTokenBalance,
        state.exchangeRates[nativeToken.symbol.toUpperCase()],
        nativeToken.decimals
    )

    Object.values(tokenBalances).forEach(({ balance, token }) => {
        netWorth += toCurrencyAmount(
            balance,
            state.exchangeRates[token.symbol],
            token.decimals
        )
    })

    return formatCurrency(netWorth, {
        currency: state.nativeCurrency,
        locale_info: state.localeInfo,
        returnNonBreakingSpace: true,
        showSymbol: false,
    })
}

export default useNetWorthBalance
