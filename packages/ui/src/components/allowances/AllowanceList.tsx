import { GroupedAllowances } from "../../context/hooks/useAccountAllowances"

import AllowanceItem from "./AllowanceItem"
import { AllowancesFilters } from "./AllowancesFilterButton"

const AllowanceList = ({ allowances }: { allowances: GroupedAllowances }) => {
    return (
        <div>
            {allowances.length > 0 &&
                allowances.map((accountAllowance) => (
                    <div key={accountAllowance.groupBy.address}>
                        <span className="text-gray-600">
                            {accountAllowance.groupBy.type ===
                            AllowancesFilters.TOKEN
                                ? `${accountAllowance.groupBy.symbol} - ${accountAllowance.groupBy.name}`
                                : accountAllowance.groupBy.name}
                        </span>
                        <div className="flex flex-col mb-6">
                            {accountAllowance.allowances.map((allowance) => {
                                const {
                                    groupBy: { type },
                                } = accountAllowance

                                const [token, spender, showToken] =
                                    type === AllowancesFilters.TOKEN
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
                                                accountAllowance.groupBy.address
                                        }
                                    >
                                        <AllowanceItem
                                            token={token}
                                            allowance={allowance.allowance}
                                            spender={spender}
                                            showToken={showToken}
                                        />
                                        <hr />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
        </div>
    )
}

export default AllowanceList
