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
                            {accountAllowance.allowances.map((allowance) => (
                                <div key={allowance.allowance.txHash}>
                                    <AllowanceItem
                                        token={
                                            accountAllowance.groupBy.type ===
                                            AllowancesFilters.TOKEN
                                                ? accountAllowance.groupBy
                                                : allowance.displayData
                                        }
                                        allowance={allowance.allowance}
                                        spender={
                                            accountAllowance.groupBy.type ===
                                            AllowancesFilters.TOKEN
                                                ? allowance.displayData
                                                : accountAllowance.groupBy
                                        }
                                        showToken={
                                            accountAllowance.groupBy.type !==
                                            AllowancesFilters.TOKEN
                                        }
                                    />
                                    <hr />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
        </div>
    )
}

export default AllowanceList
