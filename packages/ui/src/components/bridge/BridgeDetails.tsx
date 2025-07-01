import { FC, useEffect, useState } from "react"
import classnames from "classnames"
import Dialog from "../dialog/Dialog"
import CloseIcon from "../icons/CloseIcon"
import HorizontalSelect from "../input/HorizontalSelect"
import GenericTooltip from "../label/GenericTooltip"
import { Classes } from "../../styles"
import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import BridgeDetilsFees from "./BridgeDetailsFees"
import BridgeDetailsSummary from "./BridgeDetailsSummary"
import useGetBridgeTransactionsData from "../../util/hooks/useGetBridgeTransactionsData"
import TransactionDetailsBasic from "../transactions/TransactionDetailsBasic"
import isNil from "../../util/isNil"
import Divider from "../Divider"
import { TransactionDetailsTabProps } from "../transactions/TransactionDetails"

const BridgeTransactionDetails = (
    props: TransactionDetailsTabProps & { nonce?: number }
) => {
    return (
        <div className="pt-3">
            <TransactionDetailsBasic {...props} />
        </div>
    )
}

const BridgeDetails: FC<{
    onClose: () => void
    open: boolean
    transaction?: Partial<TransactionMeta>
    nonce?: number
    tab?: "summary" | "fees"
}> = ({ onClose, open, transaction, tab, nonce }) => {
    const bridgeTransactionsData = useGetBridgeTransactionsData(transaction)
    const _nonce = nonce ?? transaction?.transactionParams?.nonce
    const tabs = [
        {
            id: "summary",
            label: "Summary",
            component: BridgeDetailsSummary,
            disabled: false,
        },
        {
            id: "fees",
            label: "Fees",
            component: BridgeDetilsFees,
            disabled: false,
        },
        {
            id: "transaction",
            label: "Transaction",
            component: BridgeTransactionDetails,
            disabled: isNil(_nonce),
        },
    ]

    const [selectedTab, setSelectedTab] = useState(() => tabs[0])
    const TabComponent = selectedTab.component

    useEffect(() => {
        if (tab) {
            setSelectedTab(tabs.find((t) => t.id === tab) || tabs[0])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab])

    if (!transaction) {
        return null
    }

    return (
        <Dialog open={open} onClickOutside={onClose}>
            <span className="absolute top-0 right-0 p-4 z-50">
                <div
                    onClick={onClose}
                    className="cursor-pointer p-2 ml-auto -mr-2 text-gray-900 dark:text-white transition duration-300 rounded-full hover:bg-primary-grey-default dark:hover:bg-gray-700 hover:text-primary-blue-default dark:hover:text-blue-400"
                >
                    <CloseIcon size="10" />
                </div>
            </span>
            <div className="flex flex-col w-full h-full">
                <h2 className="px-2 pr-0 pb-2 mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                    Bridge details
                </h2>
                <HorizontalSelect
                    options={tabs}
                    value={tab}
                    onChange={(tab) => {
                        if (!tab.disabled) {
                            setSelectedTab(tab)
                        }
                    }}
                    display={(t) => {
                        return (
                            <GenericTooltip
                                bottom
                                divFull
                                disabled={!t.disabled}
                                className="!w-254 p-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                content="Not available"
                            >
                                {t.label}
                            </GenericTooltip>
                        )
                    }}
                    disableStyles
                    optionClassName={(value) =>
                        classnames(
                            `flex-1 flex flex-row items-center justify-center p-3 text-sm group transition-colors duration-200
                                    ${selectedTab.label === value.label
                                ? "border-primary-blue-default border-b-2 text-primary-blue-default font-semibold"
                                : "border-primary-grey-hover text-primary-grey-dark dark:text-gray-300 border-b hover:text-primary-blue-default dark:hover:text-blue-400"
                            }`,
                            value.disabled && "cursor-default opacity-50"
                        )
                    }
                    containerClassName="flex flex-row -ml-3 border-b border-gray-200 dark:border-gray-700"
                    containerStyle={{
                        width: "calc(100% + 1.5rem)",
                    }}
                />
                <div
                    className="flex flex-col h-[17rem] overflow-hidden overflow-y-auto py-1 -ml-3 px-3 bg-gray-50 dark:bg-gray-900"
                    style={{ width: "calc(100% + 1.5rem)" }}
                >
                    <TabComponent
                        transaction={transaction}
                        bridgeTransactionsData={bridgeTransactionsData}
                        nonce={_nonce}
                    />
                </div>
            </div>
            <div className="-mx-3">
                <Divider />
            </div>
            <button
                onClick={onClose}
                className={classnames(
                    Classes.liteButton,
                    "mt-4 !border-gray-300 dark:!border-gray-600 !bg-white dark:!bg-gray-800 !text-gray-900 dark:!text-white hover:!bg-gray-50 dark:hover:!bg-gray-700 transition-colors duration-200"
                )}
                type="button"
            >
                Close
            </button>
        </Dialog>
    )
}

export default BridgeDetails
