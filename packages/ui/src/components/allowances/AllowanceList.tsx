import {
    AccountAllowance,
    TokenAllowance,
} from "@block-wallet/background/controllers/AccountTrackerController"
import AllowanceItem from "./AllowanceItem"
import { AllowancesFilters } from "./AllowancesFilterButton"

const AllowanceList = ({
    allowances,
    groupBy,
}: {
    allowances: AccountAllowance[]
    groupBy: AllowancesFilters
}) => {
    return (
        <div>
            <span className="text-gray-600">Tether USD</span>
            <div className="flex flex-col">
                {allowances.map((allowance) => (
                    <>
                        <AllowanceItem allowance={allowance} />
                        <hr />
                    </>
                ))}
            </div>
        </div>
    )
}

export default AllowanceList
