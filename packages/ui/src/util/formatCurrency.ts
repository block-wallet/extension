import { BigNumber } from "ethers"
import { DEFAULT_DECIMALS } from "./constants"
import { convertAmount } from "./convertAmount"

const DEFAULT_LOCALE_INFO = "en-US"
const DEFAULT_CURRENCY = "USD"
const DEFAULT_DECIMAL_PRECISION = 2

const CURRENCY_SYMBOLS: { [key: string]: string } = {
    USD: "$",
}

export type formatCurrencyOptions = {
    locale_info?: string
    currency?: string
    precision?: number
    showSymbol?: boolean
    showCurrency?: boolean
    returnNonBreakingSpace?: boolean // whether or not to return a non-breaking space, if the amount is falsy
    minValue?: number
}

export function toCurrencyAmount(
    amount: BigNumber,
    exchangeRate: number,
    decimals: number = DEFAULT_DECIMALS // Ether default
): number {
    return convertAmount(amount, exchangeRate, decimals)
}

export function formatCurrency(
    currencyAmount: number,
    options?: formatCurrencyOptions
): string {
    if (currencyAmount === null || currencyAmount === undefined) {
        return options?.returnNonBreakingSpace ? "\u200b" : ""
    }

    const locale_info: string = options?.locale_info || DEFAULT_LOCALE_INFO
    const currency: string =
        options?.currency?.toLocaleUpperCase() || DEFAULT_CURRENCY
    const precision: number = options?.precision || DEFAULT_DECIMAL_PRECISION

    const showCurrency = options?.showCurrency ?? true
    const symbol =
        options?.showSymbol && currency in CURRENCY_SYMBOLS
            ? CURRENCY_SYMBOLS[currency]
            : ""

    const formatter = new Intl.NumberFormat(locale_info, {
        style: "decimal",
        currency: currency,
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
    })
    let prefix = ""
    let formattedValue = `${formatter.format(currencyAmount)}`
    if (currencyAmount < (options?.minValue ?? 0)) {
        prefix = "<"
        formattedValue = formatter.format(options?.minValue!)
    }

    return `${prefix}${symbol}${formattedValue} ${showCurrency ? currency : ""}`
}
