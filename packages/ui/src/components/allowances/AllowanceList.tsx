import { GroupedAllowances } from "../../context/hooks/useAccountAllowances"

import AllowanceItem from "./AllowanceItem"
import { AllowancesFilters } from "./AllowancesFilterButton"

const AllowanceList = ({ allowances }: { allowances: GroupedAllowances }) => {
    const groupedByToken =
        allowances.length > 0 &&
        allowances[0].groupBy.type === AllowancesFilters.TOKEN
    return (
        <div>
            {allowances.length > 0 &&
                allowances.map((accountAllowance, accountAllowanceIndex) => (
                    <div key={accountAllowance.groupBy.address}>
                        <span
                            className="text-gray-600"
                            title={accountAllowance.groupBy.address}
                        >
                            {groupedByToken
                                ? `${accountAllowance.groupBy.symbol} - ${accountAllowance.groupBy.name}`
                                : accountAllowance.groupBy.name}
                        </span>
                        <div className="flex flex-col mb-6">
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
                                            {!(
                                                accountAllowanceIndex ===
                                                    allowances.length - 1 &&
                                                allowanceIndex ===
                                                    accountAllowance.allowances
                                                        .length -
                                                        1
                                            ) && <hr />}
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
