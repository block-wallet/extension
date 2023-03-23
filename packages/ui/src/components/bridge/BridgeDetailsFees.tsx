import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import { IBridgeFeeCost } from "@block-wallet/background/utils/bridgeApi"
import { FC, Fragment } from "react"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { BridgeTransactionsData } from "../../util/hooks/useGetBridgeTransactionsData"
import Divider from "../Divider"
import ExpandableItem from "./ExpandableItem"
import FeeTokenSummaryDisplay from "./FeeTokenSummaryDisplay"

type FeesByChain = Record<string, IBridgeFeeCost[]>

const groupFeesByChain = (
    fees: IBridgeFeeCost[],
    currentChainId: number
): FeesByChain => {
    const feesByChain = fees.reduce<FeesByChain>((acc, fee) => {
        const chainFees = acc[fee.chainId.toString()] || []
        return {
            ...acc,
            [fee.chainId.toString()]: [...chainFees, fee],
        }
    }, {})

    const sortedKeys = Object.keys(feesByChain).sort((a, b) =>
        Number(a) === currentChainId ? -1 : Number(b) === currentChainId ? 1 : 0
    )
    const sortedObj = sortedKeys.reduce<FeesByChain>(
        (acc: FeesByChain, key: string) => {
            //put an space to avoid JS autosorting numeric key.
            acc[" " + key.toString()] = feesByChain[key.toString()]
            return acc
        },
        {}
    )
    return sortedObj
}

const BridgeDetilsFees: FC<{
    transaction: Partial<TransactionMeta>
    bridgeTransactionsData: BridgeTransactionsData | null
}> = ({ transaction, bridgeTransactionsData }) => {
    const { chainId } = useSelectedNetwork()
    if (!transaction.bridgeParams) {
        return null
    }
    const feeCosts = transaction.bridgeParams?.feeCosts || []
    const fees = groupFeesByChain(feeCosts, chainId)
    const getChainName = (chainId: number): string => {
        const { receivingTransaction, sendingTransaction } =
            bridgeTransactionsData || {}
        if (sendingTransaction?.chainId === chainId) {
            return sendingTransaction.networkName
        }
        if (receivingTransaction?.chainId === chainId) {
            return receivingTransaction.networkName
        }
        return chainId.toString()
    }
    return (
        <div className="flex-1 flex flex-col">
            <main className="p-2">
                {fees && Object.keys(fees).length > 0 ? (
                    <div className="flex flex-col">
                        {Object.entries(fees).map(([chainId, fees], index) => (
                            <Fragment key={chainId}>
                                {index !== 0 && (
                                    <Divider className="mt-3 mb-3" />
                                )}
                                <span>
                                    <ExpandableItem
                                        expandable
                                        defaultExpanded
                                        expanded={
                                            <div className="ml-2">
                                                {fees.map((fee) => (
                                                    <div
                                                        key={fee.token.address}
                                                    >
                                                        <FeeTokenSummaryDisplay
                                                            feeDetail={fee}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        }
                                    >
                                        <span className="text-sm font-bold">
                                            {getChainName(Number(chainId))}
                                        </span>
                                    </ExpandableItem>
                                </span>
                            </Fragment>
                        ))}
                    </div>
                ) : (
                    <span className="text-primary-grey-dark">
                        There are no fees for this operation!
                    </span>
                )}
            </main>
        </div>
    )
}

export default BridgeDetilsFees
