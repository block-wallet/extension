import React, { FC, useEffect, useState } from "react"
import classnames from "classnames"
import Dialog from "../dialog/Dialog"
import Divider from "../Divider"
import CloseIcon from "../icons/CloseIcon"
import HorizontalSelect from "../input/HorizontalSelect"
import GenericTooltip from "../label/GenericTooltip"
import { Classes } from "../../styles"
import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import BridgeDetilsFees from "./BridgeDetailsFee"
const BridgeDetailsBasic: FC<{ transaction: Partial<TransactionMeta> }> = ({
    transaction,
}) => {
    return <div />
}

const BridgeDetails: FC<{
    onClose: () => void
    open: boolean
    transaction?: Partial<TransactionMeta>
    tab?: "summary" | "fees"
}> = ({ onClose, open, transaction, tab }) => {
    const tabs = [
        {
            id: "summary",
            label: "Summary",
            component: BridgeDetailsBasic,
            disabled: false,
        },
        {
            id: "fees",
            label: "Fees",
            component: BridgeDetilsFees,
            disabled: false,
        },
    ]

    const [selectedTab, setSelectedTab] = useState(() => tabs[0])
    const TabComponent = selectedTab.component

    useEffect(() => {
        if (tab) {
            setSelectedTab(tabs.find((t) => t.id === tab) || tabs[0])
        }
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
                        if (selectedTab.disabled) return

                        setSelectedTab(tab)
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
                        `flex-1 flex flex-row items-center justify-center p-3 text-sm group
                                    ${
                                        selectedTab.label === value.label
                                            ? "border-primary-300 border-b-2 text-primary-300 font-bold"
                                            : "border-gray-200 text-gray-500 border-b"
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
                    <TabComponent transaction={transaction} />
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
