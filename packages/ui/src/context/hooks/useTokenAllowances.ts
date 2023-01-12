import { useSelectedAccount } from "./useSelectedAccount"
import { useSelectedNetwork } from "./useSelectedNetwork"
import { TokenAllowance } from "@block-wallet/background/controllers/AccountTrackerController"

/**
 * Gets the allowances for the specific Token in the selected network.
 * @param tokenAddress The address of the token to get the allowances for.
 * @returns The allowances for the token in the current selected network and the token data.
 */
const useTokenAllowances = (tokenAddress: string) => {
    const account = useSelectedAccount()!
    const selectedNetwork = useSelectedNetwork()!

    const tokenAllowances =
        account.allowances[selectedNetwork.chainId]?.tokens[
            tokenAddress.toLowerCase()
        ]?.allowances

    if (!tokenAllowances)
        return {
            token: account.allowances[selectedNetwork.chainId]?.tokens[
                tokenAddress.toLowerCase()
            ]?.token,
            allowances: [],
        }

    const tokenAllowancesArr = Object.entries(tokenAllowances) as [
        spenderAddress: string,
        allowanceDetails: TokenAllowance
    ][]

    return {
        token: account.allowances[selectedNetwork.chainId]?.tokens[
            tokenAddress.toLowerCase()
        ]?.token,
        allowances: tokenAllowancesArr,
    }

    // if (groupBy === AllowancesFilters.SPENDER) {
    //     let allowancesBySpender: any = {}

    //     Object.values(allowances.tokens).map((token) => {
    //         let tokenData = token.token
    //         Object.entries(token.allowances).map((allowance) => {
    //             const spenderAddress = allowance[0]
    //             const spenderAllowance = allowance[1]

    //             if (!allowancesBySpender[spenderAddress]) {
    //                 allowancesBySpender[spenderAddress] = {}
    //                 allowancesBySpender[spenderAddress] = {
    //                     allowances: [{ ...spenderAllowance, token: tokenData }],
    //                 }
    //             } else {
    //                 allowancesBySpender[spenderAddress] = {
    //                     allowances: [
    //                         ...allowancesBySpender[spenderAddress].allowances,
    //                         { ...spenderAllowance, token: tokenData },
    //                     ],
    //                 }
    //             }
    //         })
    //     })

    //     const allowancesBySpenderArr = Object.entries(
    //         allowancesBySpender
    //     ) as SpenderAllowances[]
    //     return allowancesBySpenderArr
    // }
}

export default useTokenAllowances
