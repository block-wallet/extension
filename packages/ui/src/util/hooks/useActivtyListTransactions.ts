import { BigNumber } from "@ethersproject/bignumber"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useActivityListState } from "../../context/background/useActivityListState"
import {
    MetaType,
    TransactionCategories,
    TransactionStatus,
} from "../../context/commTypes"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { flagQueuedTransactions } from "../transactionUtils"

const failedStatuses = [
    TransactionStatus.FAILED,
    TransactionStatus.CANCELLED,
    TransactionStatus.DROPPED,
    TransactionStatus.REJECTED,
]

const useActivtyListTransactions = () => {
    const {
        state: {
            activityList: { confirmed, pending },
        },
    } = useActivityListState()
    const { nativeCurrency: networkNativeCurrency, defaultNetworkLogo } =
        useSelectedNetwork()

    const allTransactions = pending
        .concat(confirmed)
        .map((transaction) => {
            //transaction currency is different from the native network currency
            if (transaction.transferType) {
                return transaction
            }
            const value = transaction.transactionParams.value
            return {
                ...transaction,
                transferType: {
                    amount: value ? value : BigNumber.from("0"),
                    currency: networkNativeCurrency.symbol,
                    decimals: networkNativeCurrency.decimals,
                    logo: defaultNetworkLogo,
                },
            }
        })
        .flatMap((t, _, transactions) => {
            // Remove incoming transactions with 0 value
            if (
                t.transactionParams.value &&
                BigNumber.from(t.transactionParams.value).eq(0) &&
                t.transactionCategory === TransactionCategories.INCOMING
            )
                return []

            if (t.metaType === MetaType.REGULAR_SPEEDING_UP) {
                const speedUpTx = transactions.find(
                    (tx) => tx.id && tx.id === t.replacedBy
                )

                if (!speedUpTx) return [t]

                // If the speed up transaction is still pending
                // We replace the tx hash of the one you wanted to speed up by the speed up one
                if (speedUpTx.status === TransactionStatus.SUBMITTED)
                    return [
                        {
                            ...t,
                            transactionParams: {
                                ...t.transactionParams,
                                hash:
                                    speedUpTx.transactionParams.hash ??
                                    t.transactionParams.hash,
                            },
                        },
                    ]

                // Remove the transaction that was sped up if it worked
                if (speedUpTx.status === TransactionStatus.CONFIRMED) return []

                // If both SPEEDING_UP and SPEED_UP are failed it means they got replaced
                // Manually by another tx with the same nonce. In that case, we force the hash
                // To be undefined so there's no click interaction available
                if (failedStatuses.includes(speedUpTx.status))
                    return [
                        {
                            ...t,
                            transactionParams: {
                                ...t.transactionParams,
                                hash: undefined,
                            },
                        },
                    ]
            }

            if (t.metaType === MetaType.REGULAR_CANCELLING) {
                const cancelTx = transactions.find(
                    (tx) => tx.id && tx.id === t.replacedBy
                )

                if (!cancelTx) return [t]

                if (
                    failedStatuses.includes(t.status) &&
                    failedStatuses.includes(cancelTx.status)
                )
                    return [
                        {
                            ...t,
                            transactionParams: {
                                ...t.transactionParams,
                                hash: undefined,
                            },
                            forceDrop: true,
                        },
                    ]
                else if (failedStatuses.includes(cancelTx.status)) return [t]

                return [
                    {
                        ...t,
                        transactionParams: {
                            ...t.transactionParams,
                            hash:
                                cancelTx?.transactionParams.hash ??
                                t.transactionParams.hash,
                        },
                    },
                ]
            }

            // Remove cancelation transactions, and speed up that failed or pending
            if (
                t.metaType === MetaType.CANCEL ||
                (t.metaType === MetaType.SPEED_UP &&
                    (failedStatuses.includes(t.status) ||
                        t.status === TransactionStatus.SUBMITTED))
            ) {
                return []
            }
            return [t]
        })

    return {
        transactions: flagQueuedTransactions(allTransactions),
    }
}

export default useActivtyListTransactions
