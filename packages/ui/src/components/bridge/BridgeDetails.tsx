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
                    className="cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
                >
                    <CloseIcon size="10" />
                </div>
            </span>
            <div className="flex flex-col w-full h-full">
                <h2 className="px-2 pr-0 pb-2 mt-2 text-lg font-bold">
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
                                className="!w-254 p-2 border"
                                content="Not available"
                            >
                                {t.label}
                            </GenericTooltip>
                        )
                    }}
                    disableStyles
                    optionClassName={(value) =>
                        classnames(
                            `flex-1 flex flex-row items-center justify-center p-3 text-sm group
                                    ${
                                        selectedTab.label === value.label
                                            ? "border-primary-300 border-b-2 text-primary-300 font-bold"
                                            : "border-gray-200 text-gray-500 border-b"
                                    }`,
                            value.disabled && "cursor-default"
                        )
                    }
                    containerClassName="flex flex-row -ml-3"
                    containerStyle={{
                        width: "calc(100% + 1.5rem)",
                    }}
                />
                <div
                    className="flex flex-col h-[17rem] overflow-hidden overflow-y-auto py-1 -ml-3 px-3"
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
                className={classnames(Classes.liteButton, "mt-4")}
                type="button"
            >
                Close
            </button>
        </Dialog>
    )
}

export default BridgeDetails
