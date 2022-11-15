import { Fragment, useRef, useState } from "react"
import useDOMElementObserver from "../../util/hooks/useDOMElementObserver"
import { RichedTransactionMeta } from "../../util/transactionUtils"
import dotLoading from "../../assets/images/icons/dot_loading.svg"
import { classnames } from "../../styles"
import TransactionItem from "./TransactionItem"
import { useBlankState } from "../../context/background/backgroundHooks"

const getInitialCount = (transactions: RichedTransactionMeta[]) =>
    transactions.length > 10 ? 10 : transactions.length

const TransactionsList: React.FC<{
    transactions: RichedTransactionMeta[]
}> = ({ transactions }) => {
    const state = useBlankState()!

    const isLoading =
        state.isNetworkChanging || state.isRatesChangingAfterNetworkChange

    const [transactionCount, setTransactionCount] = useState(() =>
        getInitialCount(transactions)
    )
    const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] =
        useState(false)
    const loaderRef = useRef<HTMLImageElement>(null)

    useDOMElementObserver(
        loaderRef,
        async () => {
            const countToLoad = transactions.length - transactionCount
            if (countToLoad === 0) return
            setIsLoadingMoreTransactions(true)
            await new Promise((resolve) => setTimeout(resolve, 300))
            setTransactionCount(
                transactionCount + (countToLoad > 10 ? 10 : countToLoad)
            )
            setIsLoadingMoreTransactions(false)
        },
        [transactionCount, transactions]
    )

    const transactionsLoadingSkeleton = [...Array(3)].map((x, index) => (
        <>
            {index > 0 ? <hr /> : null}
            <div className="flex items-center justify-between py-5 animate-pulse">
                <div className="flex items-center space-x-2">
                    <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-500"></div>
                    <div>
                        <div className="mb-2 h-2.5 w-20 rounded-full bg-gray-200 dark:bg-gray-600"></div>
                        <div className="h-2 w-28 rounded-full bg-gray-200 dark:bg-gray-500"></div>
                    </div>
                </div>
                <div>
                    <div className="mb-2 h-2.5 w-20 rounded-full bg-gray-200 dark:bg-gray-600"></div>
                    <div className="ml-4 h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-500"></div>
                </div>
            </div>
        </>
    ))

    return (
        <>
            {isLoading ? (
                transactionsLoadingSkeleton
            ) : (
                <>
                    {transactions.slice(0, transactionCount).map((t, i) => (
                        <Fragment key={i}>
                            {i > 0 ? <hr /> : null}
                            <TransactionItem transaction={t} index={i} />
                        </Fragment>
                    ))}
                    <img
                        ref={loaderRef}
                        src={dotLoading}
                        alt="Loader"
                        aria-label="loading"
                        role="alert"
                        aria-busy="true"
                        className={classnames(
                            "m-auto w-8 mt-4",
                            isLoadingMoreTransactions
                                ? "opacity-100"
                                : "opacity-0"
                        )}
                    />
                </>
            )}
        </>
    )
}

export default TransactionsList
