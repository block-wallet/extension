import { AccountTokenOrder } from "@block-wallet/background/controllers/AccountTrackerController"
import { TokenWithBalance } from "../context/hooks/useTokensList"
import { BigNumber } from "ethers"
import { toCurrencyAmount } from "./formatCurrency"
import { Rates } from "@block-wallet/background/controllers/ExchangeRatesController"

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
    accountTokensOrder: AccountTokenOrder[],
    exchangeRates: Rates
): TokenWithBalance[] => {
    if (tokensList.length > 1) {
        let accountTokens = [...tokensList]

        switch (sortValue) {
            case AssetsSortOptions.BALANCE:
                accountTokens.sort((tokenA, tokenB) =>
                    BigNumber.from(tokenA.balance) >
                        BigNumber.from(tokenB.balance)
                        ? -1
                        : BigNumber.from(tokenB.balance) >
                            BigNumber.from(tokenA.balance)
                            ? 1
                            : 0
                )
                break
            case AssetsSortOptions.USD_VALUE:
                accountTokens.sort((tokenA, tokenB) => {
                    const currencyAmountA = toCurrencyAmount(
                        BigNumber.from(tokenA.balance ?? 0),
                        exchangeRates[tokenA.token.symbol.toUpperCase()],
                        tokenA.token.decimals
                    )
                    const currencyAmountB = toCurrencyAmount(
                        BigNumber.from(tokenB.balance ?? 0),
                        exchangeRates[tokenB.token.symbol.toUpperCase()],
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
                if (accountTokensOrder && accountTokensOrder.length > 0) {
                    accountTokens.forEach((token) => {
                        const index = accountTokensOrder.findIndex(
                            (a) => a.tokenAddress === token.token.address
                        )
                        token.token.order =
                            accountTokensOrder[index]?.order ?? 0
                    })

                    accountTokens.sort(
                        (a, b) => (a.token.order ?? 0) - (b.token.order ?? 0)
                    )
                }

                break
        }
        return accountTokens
    }

    return tokensList
}
