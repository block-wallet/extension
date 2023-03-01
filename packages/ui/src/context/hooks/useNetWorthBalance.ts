import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import { useSelectedAccount } from "./useSelectedAccount"
import { useSelectedNetwork } from "./useSelectedNetwork"
import { BigNumber } from "@ethersproject/bignumber"
import { useBlankState } from "../background/backgroundHooks"

const useNetWorthBalance = () => {
    const state = useBlankState()!
    const selectedAccount = useSelectedAccount()
    const selectedNetwork = useSelectedNetwork()

    const balances = selectedAccount.balances[selectedNetwork.chainId]

    if (!balances)
        return formatCurrency(0, {
            currency: state.nativeCurrency,
            locale_info: state.localeInfo,
            returnNonBreakingSpace: true,
            showSymbol: true,
        })

    const tokenBalances = balances.tokens
    const nativeTokenBalance = balances.nativeTokenBalance

    let netWorth = toCurrencyAmount(
        nativeTokenBalance || BigNumber.from(0),
        state.exchangeRates[state.networkNativeCurrency.symbol],
        selectedNetwork.nativeCurrency.decimals
    )

    Object.values(tokenBalances).forEach(({ balance, token }) => {
        netWorth += toCurrencyAmount(
            balance || BigNumber.from(0),
            state.exchangeRates[token.symbol],
            token.decimals
        )
    })

    return formatCurrency(netWorth, {
        currency: state.nativeCurrency,
        locale_info: state.localeInfo,
        returnNonBreakingSpace: true,
        showSymbol: true,
    })
}

export default useNetWorthBalance
