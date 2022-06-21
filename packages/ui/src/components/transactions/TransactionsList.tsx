import React from "react"
import useDOMElementObserver from "../../util/hooks/useDOMElementObserver"
import { RichedTransactionMeta } from "../../util/transactionUtils"
import dotLoading from "../../assets/images/icons/dot_loading.svg"
import { classnames } from "../../styles"
import TransactionItem from "./TransactionItem"

const getInitialCount = (transactions: RichedTransactionMeta[]) =>
    transactions.length > 10 ? 10 : transactions.length

const TransactionsList: React.FC<{
    transactions: RichedTransactionMeta[]
}> = ({ transactions }) => {
    const [transactionCount, setTransactionCount] = React.useState(() =>
        getInitialCount(transactions)
    )
    const [isLoading, setIsLoading] = React.useState(false)
    const loaderRef = React.useRef<HTMLImageElement>(null)

    useDOMElementObserver(
        loaderRef,
        async () => {
            const countToLoad = transactions.length - transactionCount
            if (countToLoad === 0) return
            setIsLoading(true)
            await new Promise((resolve) => setTimeout(resolve, 300))
            setTransactionCount(
                transactionCount + (countToLoad > 10 ? 10 : countToLoad)
            )
            setIsLoading(false)
        },
        [transactionCount, transactions]
    )

    return (
        <>
            {transactions.slice(0, transactionCount).map((t, i) => (
                <React.Fragment key={i}>
                    {i > 0 ? <hr /> : null}
                    <TransactionItem transaction={t} index={i} />
                </React.Fragment>
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
                    isLoading ? "opacity-100" : "opacity-0"
                )}
            />
        </>
    )
}

export default TransactionsList
