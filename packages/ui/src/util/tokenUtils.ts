import { TokenWithBalance } from "../context/hooks/useTokensList"
import { getAccountTokensOrdered } from "../context/commActions"
import { BigNumber } from "ethers"
import { useMemo } from "react"
import { RequestGetAccountTokensOrder } from "@block-wallet/background/utils/types/communication"

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

export const SortTokensByValue = (
    sortValue: string,
    tokensList: TokenWithBalance[]
): TokenWithBalance[] => {
    return useMemo(() => {
        let accountTokensOrdered: RequestGetAccountTokensOrder[] = []
        if (sortValue === "CUSTOM") {
            getAccountTokensOrdered().then((result) => {
                accountTokensOrdered = result
            })
        }

        if (tokensList.length > 1) {
            let accountTokens = [...tokensList]

            switch (sortValue) {
                case "BALANCE":
                    accountTokens.sort((tokenA, tokenB) =>
                        BigNumber.from(tokenA.balance) >
                        BigNumber.from(tokenB.balance)
                            ? 1
                            : BigNumber.from(tokenB.balance) >
                              BigNumber.from(tokenA.balance)
                            ? -1
                            : 0
                    )
                    break
                case "USDVALUE":
                    accountTokens.sort((tokenA, tokenB) =>
                        tokenA.token.decimals > tokenB.token.decimals
                            ? 1
                            : tokenB.token.decimals > tokenA.token.decimals
                            ? -1
                            : 0
                    )
                    break
                case "NAME":
                    accountTokens.sort((tokenA, tokenB) =>
                        tokenA.token.name > tokenB.token.name
                            ? -1
                            : tokenB.token.name > tokenA.token.name
                            ? 1
                            : 0
                    )
                    break
                case "STABLECOINS":
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
                        tokens.concat(accountTokens)
                        accountTokens = tokens
                    }
                    break
                case "CUSTOM":
                    if (
                        accountTokensOrdered &&
                        accountTokensOrdered.length > 0
                    ) {
                        accountTokens.forEach((token) => {
                            const index = accountTokensOrdered.findIndex(
                                (a) => a.tokenAddress === token.token.address
                            )
                            token.token.order =
                                accountTokensOrdered[index]?.order ?? 0
                        })

                        accountTokens.sort(
                            (a, b) =>
                                (a.token.order ?? 0) - (b.token.order ?? 0)
                        )
                    }

                    break
            }
            return accountTokens
        }

        return tokensList
    }, [sortValue, tokensList, accountTokensOrdered])
}
