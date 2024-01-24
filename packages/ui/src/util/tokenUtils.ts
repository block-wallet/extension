import { AccountTokenOrder } from "@block-wallet/background/controllers/AccountTrackerController"
import { TokenWithBalance } from "../context/hooks/useTokensList"
import { BigNumber } from "@ethersproject/bignumber"
import { Rates } from "@block-wallet/background/controllers/ExchangeRatesController"
import { formatRounded } from "./formatRounded"
import { formatUnits } from "ethers/lib/utils"
import { toCurrencyAmount } from "./formatCurrency"
import { getValueByKey } from "./objectUtils"

const native_token_address_reduced = "0x0"
const native_token_address = "0x0000000000000000000000000000000000000000"

/**
 * compareAddresses
 *
 * Compares two addresses
 *
 * @param a First address
 * @param b Second address
 * @returns Whether or not the provided addresses are equal
 */
export const compareAddresses = (
    a: string | undefined,
    b: string | undefined
): boolean => {
    if (!a || !b) {
        return false
    }

    return a.toLowerCase() === b.toLowerCase()
}

export const isNativeTokenAddress = (address: string) => {
    if (!address) {
        return false
    }
    return (
        compareAddresses(address, native_token_address_reduced) ||
        compareAddresses(address, native_token_address)
    )
}

export enum AssetsSortOptions {
    NAME = "NAME",
    BALANCE = "BALANCE",
    USD_VALUE = "USD_VALUE",
    STABLECOINS = "STABLECOINS",
    CUSTOM = "CUSTOM",
}

export const Stablecoins: string[] = [
    "USDT",
    "USDC",
    "DAI",
    "BUSD",
    "TUSD",
    "USDD",
    "USDP",
    "XAUt",
    "GUSD",
    "JST",
    "USTC",
    "FRAX",
    "USDJ",
    "LUSD",
    "EDGT",
    "EURS",
    "USDX",
    "VAI",
    "XSGD",
    "CUSD",
    "SUSD",
    "EURt",
    "FEI",
    "RSV",
    "USDK",
    "OUSD",
    "GYEN",
    "KRT",
    "CEUR",
    "BIDR",
    "HUSD",
    "IDRT",
    "DJED",
    "XTN",
    "STAKE",
    "UNB",
    "ZUSD",
    "EOSDT",
    "XTUSD",
    "AGEUR",
    "BRZ",
    "BITCNY",
    "HBD",
    "DFD",
    "XCHF",
]

export const sortTokensByValue = (
    sortValue: AssetsSortOptions,
    tokensList: TokenWithBalance[],
    accountTokensOrder: AccountTokenOrder,
    exchangeRates: Rates,
    hideSmallBalances: boolean,
    networkNativeCurrencySymbol: string
): TokenWithBalance[] => {
    let accountTokens: TokenWithBalance[] = []

    if (hideSmallBalances) {
        accountTokens = tokensList.filter((token) => {
            const isNativeCurrencyA = isNativeTokenAddress(token.token.address)

            const currencyAmountA = toCurrencyAmount(
                BigNumber.from(token.balance),
                getValueByKey(
                    exchangeRates,
                    isNativeCurrencyA
                        ? token.token.symbol.toUpperCase()
                        : token.token.symbol,
                    0
                ),
                token.token.decimals
            )

            return (
                currencyAmountA > 0.01 ||
                token.token.symbol.toLowerCase() ===
                    networkNativeCurrencySymbol.toLowerCase()
            )
        })
    } else accountTokens = [...tokensList]

    if (accountTokens.length > 1) {
        switch (sortValue) {
            case AssetsSortOptions.BALANCE:
                accountTokens.sort((tokenA, tokenB) => {
                    const tokenABalance = Number(
                        formatRounded(
                            formatUnits(
                                tokenA.balance || "0",
                                tokenA.token.decimals
                            ),
                            4
                        )
                    )
                    const tokenBBalance = Number(
                        formatRounded(
                            formatUnits(
                                tokenB.balance || "0",
                                tokenB.token.decimals
                            ),
                            4
                        )
                    )

                    return tokenABalance > tokenBBalance
                        ? -1
                        : tokenBBalance > tokenABalance
                        ? 1
                        : 0
                })
                break
            case AssetsSortOptions.USD_VALUE:
                accountTokens.sort((tokenA, tokenB) => {
                    const isNativeCurrencyA = isNativeTokenAddress(
                        tokenA.token.address
                    )
                    const isNativeCurrencyB = isNativeTokenAddress(
                        tokenB.token.address
                    )
                    const currencyAmountA = toCurrencyAmount(
                        BigNumber.from(tokenA.balance),
                        getValueByKey(
                            exchangeRates,
                            isNativeCurrencyA
                                ? tokenA.token.symbol.toUpperCase()
                                : tokenA.token.symbol,
                            0
                        ),
                        tokenA.token.decimals
                    )
                    const currencyAmountB = toCurrencyAmount(
                        BigNumber.from(tokenB.balance),
                        getValueByKey(
                            exchangeRates,
                            isNativeCurrencyB
                                ? tokenB.token.symbol.toUpperCase()
                                : tokenB.token.symbol,
                            0
                        ),
                        tokenB.token.decimals
                    )

                    return currencyAmountA > currencyAmountB
                        ? -1
                        : currencyAmountB > currencyAmountA
                        ? 1
                        : 0
                })
                break
            case AssetsSortOptions.NAME:
                accountTokens.sort((tokenA, tokenB) =>
                    tokenA.token.symbol > tokenB.token.symbol
                        ? 1
                        : tokenB.token.symbol > tokenA.token.symbol
                        ? -1
                        : 0
                )
                break
            case AssetsSortOptions.STABLECOINS:
                const tokens: TokenWithBalance[] = []
                Stablecoins.forEach((stablecoin) => {
                    const stableTokenIndex = accountTokens.findIndex(
                        (token) => token.token.symbol === stablecoin
                    )

                    if (stableTokenIndex !== -1) {
                        tokens.push(accountTokens[stableTokenIndex])
                        accountTokens.splice(stableTokenIndex, 1)
                    }
                })

                if (tokens.length > 0) {
                    accountTokens.unshift(...tokens)
                }
                break
            case AssetsSortOptions.CUSTOM:
                if (accountTokensOrder) {
                    accountTokens.forEach((token) => {
                        token.token.order =
                            accountTokensOrder[token.token.address] ?? 0
                    })

                    accountTokens.sort(
                        (a, b) => (a.token.order ?? 0) - (b.token.order ?? 0)
                    )
                }

                break
        }
        return accountTokens
    }

    return accountTokens
}
