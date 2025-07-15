import { useState, useRef } from "react"
import TransactionsList from "./transactions/TransactionsList"
import { MdOutlineLabel } from "react-icons/md"

import { useSelectedNetwork } from "../context/hooks/useSelectedNetwork"
import { useSelectedAccount } from "../context/hooks/useSelectedAccount"

import useTransactions from "../util/hooks/useTransactions"
import { useBlankState } from "../context/background/backgroundHooks"
import { RichedTransactionMeta } from "../util/transactionUtils"
import SearchInput from "./input/SearchInput"

const ActivityList = () => {
    const { isNetworkChanging } = useBlankState()!
    const { chainId } = useSelectedNetwork()
    const { address } = useSelectedAccount()

    const { transactions } = useTransactions()
    const [filterText, setFilterText] = useState("")
    const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
    const [searchKey, setSearchKey] = useState(0)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const allLabels = Array.from(
        new Set(
            transactions
                .filter(tx => tx.labels && tx.labels.length > 0)
                .flatMap(tx => tx.labels || [])
        )
    ).sort()

    const filteredTransactions = transactions.filter((tx: RichedTransactionMeta) => {
        const textMatch = !filterText ||
            (tx.note && tx.note.toLowerCase().includes(filterText.toLowerCase()));

        const labelMatch = !selectedLabel ||
            (tx.labels && tx.labels.includes(selectedLabel));

        return (filterText ? textMatch : true) && (selectedLabel ? labelMatch : true);
    });

    const clearFilters = () => {
        setFilterText("");
        setSelectedLabel(null);
        setSearchKey(prev => prev + 1);
        if (searchInputRef.current) {
            searchInputRef.current.value = "";
        }
    };

    return (
        <div
            className="flex flex-col flex-1 w-full space-y-0 h-full max-h-[470px] min-h-[266px] bg-white dark:bg-gray-900"
            data-testid="activity-list"
        >
            <div className="pt-3 bg-white dark:bg-gray-900 z-[9] flex flex-col">
                <div className="flex flex-row space-x-2 mb-3">
                    <div className="flex-1">
                        <SearchInput
                            key={searchKey}
                            ref={searchInputRef}
                            inputClassName="!h-8"
                            placeholder="Search in notes..."
                            onChange={(e) => setFilterText(e.target.value)}
                            showClearIcon={true}
                        />
                    </div>
                </div>

                {allLabels.length > 0 && (
                    <div className="mb-3 px-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <MdOutlineLabel className="mr-1" />
                                Filter by label:
                            </div>
                            {allLabels.map(label => (
                                <button
                                    key={label}
                                    className={`px-2 py-0.5 text-xs rounded-full transition-all duration-200 ${selectedLabel === label
                                        ? "bg-primary-blue-default dark:bg-primary-blue-500 text-white"
                                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        selectedLabel === label
                                            ? setSelectedLabel(null)
                                            : setSelectedLabel(label);
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {(filterText || selectedLabel) && (
                    <div className="flex justify-end mb-2 px-6">
                        <button
                            className="text-xs text-primary-blue-default dark:text-primary-blue-400 hover:underline transition-colors duration-200"
                            onClick={clearFilters}
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>

            <TransactionsList
                transactions={filteredTransactions}
                isNetworkChanging={isNetworkChanging}
                key={`${chainId}-${address}`}
            />
        </div>
    )
}

export default ActivityList
