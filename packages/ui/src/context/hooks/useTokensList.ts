import { BigNumber } from "@ethersproject/bignumber"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"

import { useSelectedNetwork } from "./useSelectedNetwork"
import { useBlankState } from "../background/backgroundHooks"
import {
    AccountBalances,
    AccountInfo,
} from "@block-wallet/background/controllers/AccountTrackerController"
import { isHiddenAccount } from "../../util/account"
import { SortTokensByValue } from "../../util/tokenUtils"

export type TokenWithBalance = { token: Token; balance: BigNumber }

export type TokenList = TokenWithBalance[]

interface TokenListInfo {
    nativeToken: TokenWithBalance
    currentNetworkTokens: TokenWithBalance[]
}

const GetAccountNetworkTokensBalances = (
    account?: AccountInfo
): { balances: AccountBalances; chainId: number; nativeToken: Token } => {
    const { accounts, selectedAddress, hiddenAccounts } = useBlankState()!

    let balances = account
        ? isHiddenAccount(account)
            ? hiddenAccounts[account.address].balances
            : accounts[account.address].balances
        : accounts[selectedAddress].balances

    const { nativeCurrency, defaultNetworkLogo, chainId } = useSelectedNetwork()

    const nativeToken: Token = {
        address: "0x0",
        decimals: nativeCurrency.decimals,
        name: nativeCurrency.name,
        symbol: nativeCurrency.symbol,
        // Use Network Logo if nativeCurrency logo is not available
        logo: nativeCurrency.logo ?? defaultNetworkLogo,
        type: "",
    }

    return { nativeToken: nativeToken, balances: balances, chainId: chainId }
}

export const useTokensList = (account?: AccountInfo): TokenListInfo => {
    const { chainId, balances, nativeToken } =
        GetAccountNetworkTokensBalances(account)

    if (chainId in balances) {
        const { nativeTokenBalance, tokens } = balances[chainId]

        // Place tokens with balance on top
        const currentNetworkTokens = Object.values(tokens)
            .filter((token) => {
                return ![
                    "0x0000000000000000000000000000000000000000",
                    "0x0",
                ].includes(token.token.address)
            })
            .sort((a, b) => {
                const firstNumber = BigNumber.from(b.balance)
                return firstNumber.gt(a.balance)
                    ? 1
                    : firstNumber.eq(a.balance)
                    ? 0
                    : -1
            })

        return {
            nativeToken: {
                token: nativeToken,
                balance: nativeTokenBalance,
            } as TokenWithBalance,
            currentNetworkTokens,
        }
    } else {
        return {
            nativeToken: {
                token: nativeToken,
                balance: BigNumber.from("0"),
            } as TokenWithBalance,
            currentNetworkTokens: [],
        }
    }
}

export const useTokenListWithNativeToken = (
    sortValue: string,
    account?: AccountInfo
): TokenWithBalance[] => {
    const { chainId, balances, nativeToken } =
        GetAccountNetworkTokensBalances(account)

    let currentNetworkTokens: TokenWithBalance[] = []
    if (chainId in balances) {
        const { nativeTokenBalance, tokens } = balances[chainId]

        currentNetworkTokens = Object.values(tokens)
        currentNetworkTokens.push({
            token: nativeToken,
            balance: nativeTokenBalance,
        })
    } else {
        currentNetworkTokens.concat({
            token: nativeToken,
            balance: BigNumber.from("0"),
        } as TokenWithBalance)
    }

    return SortTokensByValue(sortValue, currentNetworkTokens)
}
