import { useState, useRef, useEffect } from "react"
import AutoSizer from "react-virtualized/dist/commonjs/AutoSizer"
import List from "react-virtualized/dist/commonjs/List"
import { RichedTransactionMeta } from "../../util/transactionUtils"
import TransactionItem from "./TransactionItem"
import {
    MetaType,
    TransactionCategories,
    TransactionStatus,
} from "../../context/commTypes"
import BridgeDetails from "../bridge/BridgeDetails"
import TransactionDetails from "./TransactionDetails"
import { BRIDGE_PENDING_STATUS } from "../../util/bridgeUtils"
import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import TransactionsLoadingSkeleton from "../skeleton/TransactionsLoadingSkeleton"

//Default tx height
const DEFAULT_TX_HEIGHT_IN_PX = 76

//Tx with captions (Sped up/Bridge information)
const TX_HEIHG_WITH_CAPTION = 95

//Speed-up/Cancel buttons
const TX_HEIGHT_WITH_BUTTONS = 110

const pendingSpeedingCancellingMetaTypes = [
    MetaType.REGULAR_SPEEDING_UP,
    MetaType.REGULAR_CANCELLING,
]

const confirmedSpedCancelMetaTypes = [MetaType.SPEED_UP, MetaType.CANCEL]

const getItemHeightInPx = (tx: TransactionMeta) => {
    if (tx.id) {
        if (
            tx.status === TransactionStatus.SUBMITTED &&
            !pendingSpeedingCancellingMetaTypes.includes(tx.metaType)
        ) {
            return TX_HEIGHT_WITH_BUTTONS
        } else if (tx.transactionCategory === TransactionCategories.BRIDGE) {
            return BRIDGE_PENDING_STATUS.includes(tx.bridgeParams!.status!)
                ? TX_HEIHG_WITH_CAPTION
                : DEFAULT_TX_HEIGHT_IN_PX
        } else if (confirmedSpedCancelMetaTypes.includes(tx.metaType)) {
            return TX_HEIHG_WITH_CAPTION
        }
    }
    return DEFAULT_TX_HEIGHT_IN_PX
}

interface watchDetailsType {
    transaction: TransactionMeta
}

const TransactionsList: React.FC<{
    transactions: RichedTransactionMeta[]
    isNetworkChanging: boolean
}> = ({ transactions, isNetworkChanging }) => {
    const [watchDetails, setWatchDetails] = useState<
        watchDetailsType | undefined
    >()
    const ref = useRef<any>()

    useEffect(() => {
        // react-virtualized does not recompute row height when the underlying transaction data changes.
        // thats why we force a height recompution here and adjust tx height based on its state.
        ref.current && ref.current.recomputeRowHeights(0)
    }, [transactions])

    const OperationDetails = watchDetails
        ? watchDetails.transaction.transactionCategory
            ? [
                  TransactionCategories.BRIDGE,
                  TransactionCategories.INCOMING_BRIDGE_REFUND,
                  TransactionCategories.INCOMING_BRIDGE,
              ].includes(watchDetails.transaction.transactionCategory)
                ? BridgeDetails
                : TransactionDetails
            : undefined
        : undefined

    if (isNetworkChanging) {
        return (
            <div className="w-full h-full">
                <TransactionsLoadingSkeleton />
            </div>
        )
    }

    return (
        <>
            {OperationDetails && watchDetails?.transaction && (
                <OperationDetails
                    transaction={watchDetails?.transaction}
                    open={true}
                    onClose={() => setWatchDetails(undefined)}
                />
            )}
            <AutoSizer className="hide-scroll snap-y">
                {({ height }) => (
                    <List
                        id="transactions-list"
                        height={height}
                        width={358}
                        style={{
                            overflowX: "hidden",
                            marginLeft: "-24px",
                        }}
                        ref={ref}
                        rowCount={transactions.length}
                        overscanRowCount={5}
                        rowHeight={({ index }: { index: number }) => {
                            return getItemHeightInPx(transactions[index])
                        }} // height in px
                        className="hide-scroll"
                        rowRenderer={({
                            style,
                            key,
                            index,
                        }: {
                            style: any
                            key: string
                            index: number
                        }) => (
                            <div style={style} key={key}>
                                {index > 0 ? (
                                    <div className="px-6">
                                        <hr />
                                    </div>
                                ) : null}
                                <TransactionItem
                                    onClick={() =>
                                        setWatchDetails({
                                            transaction: transactions[index],
                                        })
                                    }
                                    itemHeight={getItemHeightInPx(
                                        transactions[index]
                                    )}
                                    transaction={transactions[index]}
                                    index={index}
                                />
                            </div>
                        )}
                    ></List>
                )}
            </AutoSizer>
        </>
    )
}

export default TransactionsList
