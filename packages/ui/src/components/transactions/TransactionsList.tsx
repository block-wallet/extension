import { useState } from "react"
import AutoSizer from "react-virtualized-auto-sizer"
import { VariableSizeList as List } from "react-window"
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
import { useBlankState } from "../../context/background/backgroundHooks"
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
}> = ({ transactions }) => {
    const [watchDetails, setWatchDetails] = useState<
        watchDetailsType | undefined
    >()
    const { isNetworkChanging } = useBlankState()!

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
                {({ width, height }) => (
                    <List
                        height={height}
                        width={width}
                        style={{
                            overflowX: "hidden",
                        }}
                        itemCount={transactions.length}
                        estimatedItemSize={DEFAULT_TX_HEIGHT_IN_PX}
                        overscanCount={5}
                        itemSize={(index) => {
                            const tx = transactions[index]
                            return getItemHeightInPx(tx)
                        }} // height in px
                        itemData={transactions}
                        className="hide-scroll"
                    >
                        {({ style, data, index }) => (
                            <div style={style} key={data[index].id || index}>
                                {index > 0 ? (
                                    <div className="px-6">
                                        <hr />
                                    </div>
                                ) : null}
                                <TransactionItem
                                    onClick={() =>
                                        setWatchDetails({
                                            transaction: data[index],
                                        })
                                    }
                                    itemHeight={getItemHeightInPx(data[index])}
                                    transaction={data[index]}
                                    index={index}
                                />
                            </div>
                        )}
                    </List>
                )}
            </AutoSizer>
        </>
    )
}

export default TransactionsList
