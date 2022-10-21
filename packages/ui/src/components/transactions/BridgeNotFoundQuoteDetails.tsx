import { FunctionComponent, useState } from "react"
import TransactionDetailsBasic from "./TransactionDetailsBasic"
import TransactionDetailsAdvanced from "./TransactionDetailsAdvanced"
import Dialog from "../dialog/Dialog"
import HorizontalSelect from "../input/HorizontalSelect"
import CloseIcon from "../icons/CloseIcon"
import Divider from "../Divider"
import { Classes, classnames } from "../../styles"
import { RichedTransactionMeta } from "../../util/transactionUtils"
import GenericTooltip from "../label/GenericTooltip"
interface Error {
    errorType: string
    code: string
    tool: string
    message: string
}

export type BridgeNotFoundQuoteDetailsProps = {
    open: boolean
    onClose: () => void
    message: string
    errors: Error[]
}

export const BridgeNotFoundQuoteDetails: FunctionComponent<
    BridgeNotFoundQuoteDetailsProps
> = ({ open, onClose, message, errors }) => {
    return (
        <Dialog open={open} onClickOutside={onClose}>
            <span className="absolute top-0 right-0 p-4 z-50">
                <div
                    onClick={onClose}
                    className="cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
                >
                    <CloseIcon size="10" />
                </div>
            </span>

            <div className="flex flex-col w-full h-full">
                <h2 className="px-2 pr-0 pb-2 mt-2 text-lg font-bold">
                    Quote not founds details
                </h2>
                <div
                    className="flex flex-col h-[17rem] overflow-auto py-4 -ml-3 px-3"
                    style={{ width: "calc(100% + 1.5rem)" }}
                >
                    {"<TabComponent transaction={transaction} nonce={nonce} />"}
                </div>
            </div>
            <div className="-mx-3">
                <Divider />
            </div>
            <button
                onClick={onClose}
                className={classnames(Classes.liteButton, "mt-4")}
                type="button"
            >
                Close
            </button>
        </Dialog>
    )
}

export default BridgeNotFoundQuoteDetails
