import { useBlankState } from "../background/backgroundHooks"
import { useTokensList } from "./useTokensList"

import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { formatUnits } from "@ethersproject/units"
import { BigNumber } from "@ethersproject/bignumber"
import { formatRounded } from "../../util/formatRounded"

interface NetWorthBalance {
    displayNetWorth: boolean;
    nativeCurrencyAmount?: string;
    nativeTokenBalance?: string;
    nativeTokenBalanceRounded?: string;
    netWorth?: string;
}

const useNetWorthBalance = (account?: AccountInfo): NetWorthBalance => {
    const { exchangeRates, nativeCurrency, localeInfo, settings } = useBlankState()!
    const displayNetWorth = settings.displayNetWorth;

    const assets = useTokensList(account)

    const tokenBalances = assets.currentNetworkTokens

    const nativeToken = assets.nativeToken


    if (displayNetWorth) {

        let netWorth = toCurrencyAmount(
            nativeToken.balance,
            exchangeRates[nativeToken.token.symbol.toUpperCase()],
            nativeToken.token.decimals
        )

        Object.values(tokenBalances).forEach(({ balance, token }) => {
            netWorth += toCurrencyAmount(
                balance,
                exchangeRates[token.symbol],
                token.decimals
            )
        })

        // Net Worth value. i.e.: 200 USD
        return {
            displayNetWorth,
            netWorth: formatCurrency(netWorth, {
                currency: nativeCurrency,
                locale_info: localeInfo,
                returnNonBreakingSpace: true,
                showSymbol: false,
            })
        }

    }

    // Native token balance only. i.e.: 0.1 ETH

    const nativeTokenBalance = formatUnits(
        nativeToken.balance || "0",
        nativeToken.token.decimals
    )
    return {
        displayNetWorth,
        nativeCurrencyAmount: formatCurrency(
            toCurrencyAmount(
                nativeToken.balance ||
                BigNumber.from(0),
                exchangeRates[
                nativeToken.token.symbol
                ],
                nativeToken.token.decimals
            ),
            {
                currency: nativeCurrency,
                locale_info: localeInfo,
                returnNonBreakingSpace: true,
                showSymbol: false,
            }
        ),
        nativeTokenBalance: `${nativeTokenBalance} ${nativeToken.token.symbol}`,
        nativeTokenBalanceRounded: `${formatRounded(nativeTokenBalance, 5)} ${nativeToken.token.symbol}`,
    }
}

export default useNetWorthBalance
