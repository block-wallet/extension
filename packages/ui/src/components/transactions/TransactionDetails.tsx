import { FunctionComponent, useState } from "react"
import TransactionDetailsBasic from "./TransactionDetailsBasic"
import TransactionDetailsAdvanced from "./TransactionDetailsAdvanced"
import Dialog from "../dialog/Dialog"
import HorizontalSelect from "../input/HorizontalSelect"
import CloseIcon from "../icons/CloseIcon"
import Divider from "../Divider"
import { Classes, classnames } from "../../styles"
import GenericTooltip from "../label/GenericTooltip"
import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"

export type TransactionDetailsProps = {
    open: boolean
    onClose: () => void
    transaction: Partial<TransactionMeta>
    nonce?: number
}

export type TransactionDetailsTabProps = {
    transaction: TransactionMeta | Partial<TransactionMeta>
}

export const TransactionDetails: FunctionComponent<TransactionDetailsProps> = ({
    open,
    onClose,
    transaction,
    nonce,
}) => {
    const tabs = [
        {
            label: "Summary",
            component: TransactionDetailsBasic,
            disabled: false,
        },
        {
            label: "Contract",
            component: TransactionDetailsAdvanced,
            disabled: !transaction.methodSignature,
        },
    ]

    const [tab, setTab] = useState(() => tabs[0])
    const TabComponent = tab.component

    return (
        <Dialog open={open} onClickOutside={onClose}>
            <span className="absolute top-0 right-0 p-4 z-50">
                <div
                    onClick={onClose}
                    className="cursor-pointer p-2 ml-auto -mr-2 text-gray-900 dark:text-gray-100 transition duration-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-blue-default dark:hover:text-primary-blue-400"
                >
                    <CloseIcon size="10" />
                </div>
            </span>

            <div className="flex flex-col w-full h-full">
                <h2 className="px-2 pr-0 pb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Transaction details
                </h2>
                <HorizontalSelect
                    options={tabs}
                    value={tab}
                    onChange={(tab) => {
                        if (tab.disabled) return

                        setTab(tab)
                    }}
                    display={(t) => {
                        return (
                            <GenericTooltip
                                top
                                divFull
                                disabled={!t.disabled}
                                className="w-38 p-2 left-1"
                                content="Not available for this transaction"
                            >
                                {t.label}
                            </GenericTooltip>
                        )
                    }}
                    disableStyles
                    optionClassName={(value) =>
                        `flex-1 flex flex-row items-center justify-center p-3 text-sm group transition-colors duration-200
                                    ${tab.label === value.label
                            ? "border-primary-blue-default dark:border-primary-blue-400 border-b-2 text-primary-blue-default dark:text-primary-blue-400 font-semibold"
                            : value.disabled
                                ? "border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 border-b font-medium"
                                : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 border-b hover:text-primary-blue-default dark:hover:text-primary-blue-400 font-medium"
                        }`
                    }
                    containerClassName="flex flex-row -ml-3"
                    containerStyle={{
                        width: "calc(100% + 1.5rem)",
                    }}
                />
                <div
                    className="flex flex-col h-[17rem] overflow-auto py-4 -ml-3 px-3"
                    style={{ width: "calc(100% + 1.5rem)" }}
                >
                    <TabComponent transaction={transaction} nonce={nonce} />
                </div>
            </div>
            <div className="-mx-3">
                <Divider />
            </div>
            <button
                onClick={onClose}
                className={classnames(Classes.liteButton, "mt-4 -mb-2 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800")}
                type="button"
            >
                Close
            </button>
        </Dialog>
    )
}

export default TransactionDetails
