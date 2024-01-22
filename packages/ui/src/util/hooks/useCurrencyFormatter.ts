import { BigNumber } from "@ethersproject/bignumber"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useExchangeRatesState } from "../../context/background/useExchangeRatesState"
import { formatCurrency, toCurrencyAmount } from "../formatCurrency"
import { getValueByKey } from "../objectUtils"

const useCurrencyFromatter = () => {
    const state = useBlankState()!
    const {
        state: { exchangeRates },
    } = useExchangeRatesState()
    const format = (
        amount: BigNumber,
        tokenSymbol: string,
        decimals: number,
        isNativeCurrency = false
    ) => {
        const currencyAmount = toCurrencyAmount(
            amount || BigNumber.from(0),
            getValueByKey(
                exchangeRates,
                isNativeCurrency ? tokenSymbol.toUpperCase() : tokenSymbol,
                0
            ),
            decimals
        )

        return formatCurrency(currencyAmount, {
            currency: state.nativeCurrency,
            locale_info: state.localeInfo,
            returnNonBreakingSpace: true,
            showSymbol: false,
        })
    }
    return { format }
}

export default useCurrencyFromatter
