import { Fragment, useRef, useState } from "react"
import useDOMElementObserver from "../../util/hooks/useDOMElementObserver"
import { RichedTransactionMeta } from "../../util/transactionUtils"
import dotLoading from "../../assets/images/icons/dot_loading.svg"
import { classnames } from "../../styles"
import TransactionItem from "./TransactionItem"
import { useBlankState } from "../../context/background/backgroundHooks"
import AnimatedIcon, { AnimatedIconName } from "../AnimatedIcon"

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
        <div key={index}>
            {index > 0 ? <hr /> : null}
            <div className="flex items-center justify-between py-5">
                <div className="flex items-center space-x-2">
                    <div className="flex justify-center items-center h-9 w-9 rounded-full border">
                        <AnimatedIcon
                            icon={AnimatedIconName.GreyCircleLoadingSkeleton}
                            className={classnames(
                                "w-4 h-4 pointer-events-none",
                                index % 2 === 1 && "rotate-180"
                            )}
                            loop
                        />
                    </div>
                    <div>
                        <AnimatedIcon
                            icon={AnimatedIconName.GreyLineLoadingSkeleton}
                            className="mb-2 h-3 w-16 rotate-180"
                            svgClassName="rounded-md"
                            loop
                        />
                        <AnimatedIcon
                            icon={AnimatedIconName.GreyLineLoadingSkeleton}
                            className="h-3 w-24"
                            svgClassName="rounded-md"
                            loop
                        />
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <AnimatedIcon
                        icon={AnimatedIconName.GreyLineLoadingSkeleton}
                        className="mb-2 h-3 w-10"
                        svgClassName="rounded-md"
                        loop
                    />
                    <AnimatedIcon
                        icon={AnimatedIconName.GreyLineLoadingSkeleton}
                        className="h-3 w-16 rotate-180"
                        svgClassName="rounded-md"
                        loop
                    />
                </div>
            </div>
        </div>
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
