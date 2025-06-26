import { GroupedAllowances } from "../../context/hooks/useAccountAllowances"

import AllowanceItem from "./AllowanceItem"
import { AllowancesFilters } from "./AllowancesFilterButton"

const AllowanceList = ({ allowances }: { allowances: GroupedAllowances }) => {
    const groupedByToken =
        allowances.length > 0 &&
        allowances[0].groupBy.type === AllowancesFilters.TOKEN

    return (
        <div className="space-y-6">
            {allowances.length > 0 &&
                allowances.map((accountAllowance, accountAllowanceIndex) => (
                    <div key={accountAllowance.groupBy.address} className="space-y-3">
                        {/* Group Header */}
                        <div className="flex items-center space-x-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex-1">
                                <h3
                                    className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate"
                                    title={`${accountAllowance.groupBy.name} (${accountAllowance.groupBy.address})`}
                                >
                                    {groupedByToken
                                        ? `${accountAllowance.groupBy.symbol} - ${accountAllowance.groupBy.name}`
                                        : accountAllowance.groupBy.name}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                    {accountAllowance.groupBy.address}
                                </p>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                                {accountAllowance.allowances.length} allowance{accountAllowance.allowances.length !== 1 ? 's' : ''}
                            </div>
                        </div>

                        {/* Allowances List */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {accountAllowance.allowances.map(
                                (allowance, allowanceIndex) => {
                                    const [token, spender, showToken] =
                                        groupedByToken
                                            ? [
                                                accountAllowance.groupBy,
                                                allowance.displayData,
                                                false,
                                            ]
                                            : [
                                                allowance.displayData,
                                                accountAllowance.groupBy,
                                                true,
                                            ]
                                    return (
                                        <div
                                            key={
                                                allowance.allowance.txHash ||
                                                allowance.displayData.address +
                                                accountAllowance.groupBy
                                                    .address
                                            }
                                        >
                                            <AllowanceItem
                                                token={token}
                                                allowance={allowance.allowance}
                                                spender={spender}
                                                showToken={showToken}
                                            />
                                            {allowanceIndex < accountAllowance.allowances.length - 1 && (
                                                <hr className="border-gray-200 dark:border-gray-700" />
                                            )}
                                        </div>
                                    )
                                }
                            )}
                        </div>
                    </div>
                ))}
        </div>
    )
}

export default AllowanceList
