import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import { IBridgeFeeCost } from "@block-wallet/background/utils/bridgeApi"
import { FC } from "react"
import { getBlockWalletFeeCost } from "../../util/bridgeTransactionUtils"
import Divider from "../Divider"
import FeeTokenSummaryDisplay from "./FeeTokenSummaryDisplay"

const BridgeDetilsFees: FC<{ transaction: Partial<TransactionMeta> }> = ({
    transaction,
}) => {
    if (!transaction.bridgeParams) {
        return null
    }
    const blockWalletFee: IBridgeFeeCost = getBlockWalletFeeCost(
        transaction.bridgeParams
    )
    const extraFees = transaction.bridgeParams?.feeCosts
    return (
        <div className="flex-1 flex flex-col">
            <main className="p-1">
                <span className="text-sm font-bold">BlockWallet Fee</span>
                <br />
                <div className="mt-2">
                    <FeeTokenSummaryDisplay feeDetail={blockWalletFee} />
                </div>
                <div className="py-3">
                    <Divider />
                </div>
                {extraFees && (
                    <div>
                        <span className="text-sm font-bold">Bridge Fees</span>
                        <br />
                        <div className="flex flex-col">
                            {extraFees.map((extraFee) => {
                                return (
                                    <div
                                        key={extraFee.token.symbol}
                                        className="mt-2"
                                    >
                                        <FeeTokenSummaryDisplay
                                            feeDetail={extraFee}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

export default BridgeDetilsFees
