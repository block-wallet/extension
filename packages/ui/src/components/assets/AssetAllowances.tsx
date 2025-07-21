import { useOnMountHistory } from "../../context/hooks/useOnMount"
import AllowanceItem from "../allowances/AllowanceItem"
import useAccountAllowances from "../../context/hooks/useAccountAllowances"
import { AllowancesFilters } from "../allowances/AllowancesFilterButton"
import { ActionButton } from "../button/ActionButton"
import GearIcon from "../../components/icons/GearIcon"
import { isNativeTokenAddress } from "../../util/tokenUtils"

const AssetAllowances = () => {
    const history = useOnMountHistory()
    const tokenAddress: string = history.location.state?.address

    const tokenAllowances = useAccountAllowances(
        AllowancesFilters.TOKEN,
        tokenAddress
    )[0]

    if (!tokenAddress) {
        return (
            <div className="flex items-center justify-center flex-1 p-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    Token address not found
                </span>
            </div>
        )
    }

    const emptyMessage = isNativeTokenAddress(tokenAddress)
        ? "Native tokens do not require allowances. You can access all your allowances via the button below."
        : "You have no allowances for this token."

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden">
            {tokenAllowances?.allowances?.length > 0 ? (
                <>
                    <div className="flex-1 overflow-auto">
                        <div className="space-y-0">
                            {tokenAllowances.allowances.map((allowance, index) => (
                                <div
                                    key={
                                        allowance.allowance.txHash ||
                                        allowance.displayData.address
                                    }
                                >
                                    {index > 0 && <hr className="border-gray-200 dark:border-gray-700" />}
                                    <AllowanceItem
                                        allowance={allowance.allowance}
                                        token={tokenAllowances?.groupBy}
                                        spender={allowance.displayData}
                                        showToken={false}
                                        fromAssetDetails={true}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                        <ActionButton
                            icon={<GearIcon />}
                            label="Manage Allowances"
                            to="/accounts/menu/allowances"
                            className="!h-10 !p-3 !text-xs"
                        />
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center justify-center flex-1 p-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
                            {emptyMessage}
                        </span>
                    </div>
                    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                        <ActionButton
                            icon={<GearIcon />}
                            label="Manage Allowances"
                            to="/accounts/menu/allowances"
                            className="!h-10 !p-3 !text-xs"
                        />
                    </div>
                </>
            )}
        </div>
    )
}

export default AssetAllowances
