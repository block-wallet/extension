import { BigNumber } from "@ethersproject/bignumber"
import { useBlankState } from "../background/backgroundHooks"
import { TransactionCategories } from "../commTypes"
import { useSelectedAccount } from "./useSelectedAccount"
import { useSelectedNetwork } from "./useSelectedNetwork"
import { TokenList, useTokensList } from "./useTokensList"

/**
 *  Returns the list of swapped assets
 */
export const useSwappedTokenList = (): TokenList => {
    const { balances } = useSelectedAccount()
    const { chainId } = useSelectedNetwork()
    const { transactions } = useBlankState()!
    const { nativeToken } = useTokensList()

    const swapTransactionList = transactions.filter(
        (t) => t.transactionCategory === TransactionCategories.EXCHANGE
    )

    // Get asset from swap transaction
    const assetList: string[] = []

    for (let i = 0; i < swapTransactionList.length; i++) {
        const address = swapTransactionList[i].exchangeParams?.toToken.address

        if (address) {
            assetList.push(address.toLowerCase())
        }
    }

    if (chainId in balances) {
        const { tokens } = balances[chainId]

        // Place tokens with balance on top
        const currentNetworkTokens = Object.values(tokens)
            .filter((token) => {
                return assetList.includes(token.token.address.toLowerCase())
            })
            .sort((a, b) => {
                const firstNumber = BigNumber.from(b.balance)

                return firstNumber.gt(a.balance)
                    ? 1
                    : firstNumber.eq(a.balance)
                    ? 0
                    : -1
            })

        return [nativeToken].concat(currentNetworkTokens)
    } else {
        return [nativeToken]
    }
}
