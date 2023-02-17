import { useOnMountHistory } from "../../context/hooks/useOnMount"
import AllowanceItem from "../allowances/AllowanceItem"
import useAccountAllowances from "../../context/hooks/useAccountAllowances"
import { AllowancesFilters } from "../allowances/AllowancesFilterButton"
import { ActionButton } from "../button/ActionButton"
import GearIcon from "../../components/icons/GearIcon"
import { isNativeTokenAddress } from "../../util/tokenUtils"

const AssetAllowances = () => {
    const history = useOnMountHistory()
    const tokenAddress: string = history.location.state.address

    const tokenAllowances = useAccountAllowances(
        AllowancesFilters.TOKEN,
        tokenAddress
    )[0]

    const emptyMessage = isNativeTokenAddress(tokenAddress)
        ? "Native tokens do not require allowances. You can access all your allowances via the button below."
        : "You have no allowances for this token."

    return (
        <>
            {tokenAllowances?.allowances?.length > 0 ? (
                tokenAllowances.allowances.map((allowance, index) => (
                    <div
                        key={
                            allowance.allowance.txHash ||
                            allowance.displayData.address
                        }
                    >
                        {index > 0 && <hr />}
                        <AllowanceItem
                            allowance={allowance.allowance}
                            token={tokenAllowances?.groupBy}
                            spender={allowance.displayData}
                            showToken={false}
                            fromAssetDetails={true}
                        />
                    </div>
                ))
            ) : (
                <span className="text-sm text-gray-500 pt-4 mx-auto">
                    {emptyMessage}
                </span>
            )}
            <div className="flex flex-col w-full mt-4">
                <ActionButton
                    icon={<GearIcon />}
                    label="Manage Allowances"
                    to="/accounts/menu/allowances"
                />
            </div>
        </>
    )
}

export default AssetAllowances
