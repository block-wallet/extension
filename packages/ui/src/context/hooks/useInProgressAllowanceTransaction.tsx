import { useBlankState } from "../background/backgroundHooks"
import { TransactionCategories, TransactionStatus } from "../commTypes"

/**
 * useInProgressAllowanceTransaction
 *
 * This hook returns an in progress allowance transaction of the provided token address.
 *
 * If the transaction is not pending of confirmation, this hook will return undefined.
 *
 * @returns Pending allowance transaction
 */
export const useInProgressAllowanceTransaction = (tokenAddress: string) => {
    const { transactions } = useBlankState()!

    const validStates = [TransactionStatus.SUBMITTED]

    const filteredTransactions = transactions.filter(
        (t) =>
            validStates.includes(t.status) &&
            t.transactionCategory ===
                TransactionCategories.TOKEN_METHOD_APPROVE &&
            t.transactionParams.to?.toLowerCase() ===
                tokenAddress?.toLowerCase()
    )
    return filteredTransactions.length > 0 ? filteredTransactions[0] : undefined
}
