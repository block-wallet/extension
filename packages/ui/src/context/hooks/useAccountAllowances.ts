import { useSelectedAccount } from "./useSelectedAccount"
import { useSelectedNetwork } from "./useSelectedNetwork"
import { AllowancesFilters } from "../../components/allowances/AllowancesFilterButton"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { TokenAllowance } from "@block-wallet/background/controllers/AccountTrackerController"

// export type AllowanceWithToken = Token & TokenAllowance

// export type SpenderAllowances = [
//     spenderAddress: string,
//     allowancesObj: {
//         allowances: [AllowanceWithToken]
//     }
// ]

/**
 *
 * Gets the allowances for the selected account of the selected network.
 *
 */
const useAccountAllowances = (groupBy: AllowancesFilters) => {
    const account = useSelectedAccount()!
    const selectedNetwork = useSelectedNetwork()!
    let allowances = account.allowances[selectedNetwork.chainId]

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
    return allowances
}

export default useAccountAllowances
