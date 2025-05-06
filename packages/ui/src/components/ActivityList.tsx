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
            className="flex flex-col flex-1 w-full space-y-0 h-full max-h-[470px] min-h-[266px]"
            data-testid="activity-list"
        >
            <div className="px-6 pb-2">
                <div className="flex items-center justify-between mb-2">
                    <button
                        className="flex items-center text-xs text-primary-blue-default px-2 py-1 rounded-md border border-primary-grey-hover hover:bg-primary-grey-default"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <FiFilter size={14} className="mr-1" />
                        {showFilters ? "Hide filters" : "Filters"}
                        {showFilters ?
                            <FiChevronUp size={14} className="ml-1" /> :
                            <FiChevronDown size={14} className="ml-1" />
                        }
                    </button>

                    {(filterText || selectedLabel) && (
                        <div className="flex items-center">
                            <span className="text-xs text-primary-grey-dark mr-1">Filters active</span>
                            <button
                                className="text-xs text-primary-blue-default hover:underline"
                                onClick={clearFilters}
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>

                {showFilters && (
                    <div className="mb-3 space-y-2">
                        <div className="relative">
                            <FiSearch className="absolute left-2 top-2 text-gray-400" size={16} />
                            <input
                                type="text"
                                className="w-full pl-8 pr-3 py-1 text-sm border border-primary-grey-hover rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue-default"
                                placeholder="Search in notes..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                            />
                        </div>

                        {allLabels.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center text-xs text-gray-500">
                                    <MdOutlineLabel className="mr-1" />
                                    Filter by label:
                                </div>
                                {allLabels.map(label => (
                                    <button
                                        key={label}
                                        className={`px-2 py-0.5 text-xs rounded-full ${selectedLabel === label
                                            ? "bg-primary-blue-default text-white"
                                            : "bg-primary-grey-default text-gray-700 hover:bg-primary-grey-hover"
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
