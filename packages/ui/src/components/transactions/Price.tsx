import { FunctionComponent } from "react"
import { BigNumber } from "@ethersproject/bignumber"

// Utils
import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import formatTransactionValue from "../../util/formatTransactionValue"

// Hooks
import { useBlankState } from "../../context/background/backgroundHooks"
import { getValueByKey } from "../../util/objectUtils"
import { useExchangeRatesState } from "../../context/background/useExchangeRatesState"

const Price: FunctionComponent<{
    title: string
    amount: BigNumber
    symbol: string
    decimals: number
}> = ({ title, amount, symbol, decimals }) => {
    const state = useBlankState()!
    const {
        state: { exchangeRates },
    } = useExchangeRatesState()

    const txValue = formatTransactionValue(
        {
            amount,
            currency: symbol,
            decimals: decimals,
        },
        true,
        9
    )

    const currencyAmount = toCurrencyAmount(
        amount,
        getValueByKey(exchangeRates, symbol.toUpperCase(), 0),
        decimals
    )

    return (
        <div className="flex justify-between">
            <span className="text-xs text-gray-400 uppercase w-2/5 mt-1">
                {title}
            </span>
            <div className="flex flex-col justify-start w-3/5 pl-4">
                <div className="w-full flex justify-end">
                    <span
                        className="text-lg uppercase text-primary-black-default text-right truncate w-4/5 mr-1"
                        title={txValue.join(" ")}
                    >
                        {txValue[0]}
                    </span>
                    <span className="text-lg uppercase text-right">
                        {symbol}
                    </span>
                </div>
                <div className="flex justify-end items-end">
                    <span
                        className="text-xs uppercase text-gray-400 truncate w-5/6 text-right mr-1"
                        title={formatCurrency(currencyAmount, {
                            currency: state.nativeCurrency,
                            locale_info: state.localeInfo,
                            returnNonBreakingSpace: true,
                            showSymbol: false,
                        })}
                    >
                        {formatCurrency(currencyAmount, {
                            currency: state.nativeCurrency,
                            locale_info: state.localeInfo,
                            returnNonBreakingSpace: true,
                            showSymbol: false,
                            showCurrency: false,
                        })}
                    </span>
                    <span className="text-xs text-right text-gray-400">
                        {state.nativeCurrency.toUpperCase()}
                    </span>
                </div>
            </div>
        </div>
    )
}

export default Price
