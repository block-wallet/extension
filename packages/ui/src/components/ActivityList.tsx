import { useState } from "react"
import TransactionsList from "./transactions/TransactionsList"
import { FiFilter, FiSearch, FiChevronDown, FiChevronUp } from "react-icons/fi"
import { MdOutlineLabel } from "react-icons/md"

// Context
import { useSelectedNetwork } from "../context/hooks/useSelectedNetwork"
import { useSelectedAccount } from "../context/hooks/useSelectedAccount"

// Utils
import useTransactions from "../util/hooks/useTransactions"
import { useBlankState } from "../context/background/backgroundHooks"
import { RichedTransactionMeta } from "../util/transactionUtils"

const ActivityList = () => {
    const { isNetworkChanging } = useBlankState()!
    const { chainId } = useSelectedNetwork()
    const { address } = useSelectedAccount()

    const { transactions } = useTransactions()
    const [filterText, setFilterText] = useState("")
    const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)

    // Collect unique labels from all transactions
    const allLabels = Array.from(
        new Set(
            transactions
                .filter(tx => tx.labels && tx.labels.length > 0)
                .flatMap(tx => tx.labels || [])
        )
    ).sort()

    // Filter transactions based on search text and selected label
    const filteredTransactions = transactions.filter((tx: RichedTransactionMeta) => {
        // Filter by text (in note)
        const textMatch = !filterText ||
            (tx.note && tx.note.toLowerCase().includes(filterText.toLowerCase()));

        // Filter by selected label
        const labelMatch = !selectedLabel ||
            (tx.labels && tx.labels.includes(selectedLabel));

        return (filterText ? textMatch : true) && (selectedLabel ? labelMatch : true);
    });

    // Clear all filters
    const clearFilters = () => {
        setFilterText("");
        setSelectedLabel(null);
    };

    return (
        <div
            className="flex flex-col flex-1 w-full space-y-0 h-full max-h-[470px] min-h-[266px] bg-white dark:bg-gray-900"
            data-testid="activity-list"
        >
            <div className="px-6 pb-2 pt-3 bg-white dark:bg-gray-900">
                <div className="flex items-center justify-end mb-2 space-x-2">
                    {(filterText || selectedLabel) && (
                        <div className="flex items-center">
                            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Filters active</span>
                            <button
                                className="text-xs text-primary-blue-default dark:text-primary-blue-400 hover:underline transition-colors duration-200"
                                onClick={clearFilters}
                            >
                                Clear
                            </button>
                        </div>
                    )}
                    <button
                        className="flex items-center text-xs text-primary-blue-default dark:text-primary-blue-400 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <FiFilter size={14} className="mr-1" />
                        {showFilters ? "Hide filters" : "Filters"}
                        {showFilters ?
                            <FiChevronUp size={14} className="ml-1" /> :
                            <FiChevronDown size={14} className="ml-1" />
                        }
                    </button>
                </div>

                {showFilters && (
                    <div className="mb-3 space-y-2">
                        <div className="relative">
                            <FiSearch className="absolute left-2 top-2 text-gray-400 dark:text-gray-500" size={16} />
                            <input
                                type="text"
                                className="w-full pl-8 pr-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue-default dark:focus:ring-primary-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
                                placeholder="Search in notes..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                            />
                        </div>

                        {allLabels.length > 0 && (
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
                        )}
                    </div>
                )}
            </div>

            <TransactionsList
                transactions={filteredTransactions}
                isNetworkChanging={isNetworkChanging}
                //When the chainId and/or the address changes, this component is unmounted and mounted again.
                key={`${chainId}-${address}`}
            />
        </div>
    )
}

export default ActivityList
