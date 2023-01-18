import { useOnMountHistory } from "../../context/hooks/useOnMount"
import AllowanceItem from "../allowances/AllowanceItem"
import useAccountAllowances from "../../context/hooks/useAccountAllowances"
import { AllowancesFilters } from "../allowances/AllowancesFilterButton"

const AssetAllowances = () => {
    const history = useOnMountHistory()
    const tokenAddress: string = history.location.state.address

    const tokenAllowances = useAccountAllowances(AllowancesFilters.TOKEN)!.find(
        (allowance) => allowance.groupBy.address === tokenAddress
    )

    return (
        <>
            {tokenAllowances && tokenAllowances.allowances?.length > 0 ? (
                tokenAllowances.allowances.map((allowance) => (
                    <div key={allowance.allowance.txHash}>
                        <AllowanceItem
                            allowance={allowance.allowance}
                            token={tokenAllowances.groupBy}
                            spender={allowance.displayData}
                            showToken={false}
                            fromAssetDetails={true}
                        />
                        <hr />
                    </div>
                ))
            ) : (
                <span className="text-sm text-gray-500 pt-4 mx-auto">
                    You have no allowances for this token.
                </span>
            )}
        </>
    )
}

export default AssetAllowances
