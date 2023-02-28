import { ActionButton } from "../button/ActionButton"
import plus from "../../assets/images/icons/plus.svg"
import AssetsList from "./AssetsList"
import classnames from "classnames"
import { useTokensList } from "../../context/hooks/useTokensList"
import { useBlankState } from "../../context/background/backgroundHooks"
import AssetsLoadingSkeleton from "../skeleton/AssetsLoadingSkeleton"

const AddTokenButton = () => {
    return (
        <div className="flex flex-col w-full space-y-1 py-2 flex px-6">
            <ActionButton
                icon={plus}
                label="Add Token"
                to="/settings/tokens/add"
            />
        </div>
    )
}

const AssetsOverview = () => {
    const { currentNetworkTokens, nativeToken } = useTokensList()
    const { isNetworkChanging } = useBlankState()!
    const tokens = [nativeToken].concat(currentNetworkTokens)

    const dislpayTopButton = tokens.length > 8

    if (isNetworkChanging) {
        return (
            <div className="w-full h-full">
                <AssetsLoadingSkeleton />
            </div>
        )
    }

    return (
        <div
            className={classnames(
                "flex flex-col w-full space-y-4 justify-between overflow-y-auto hide-scroll max-h-[450px]"
            )}
            data-testid="assets-list"
        >
            {dislpayTopButton && <AddTokenButton />}
            <AssetsList assets={tokens} />
            <AddTokenButton />
        </div>
    )
}

export default AssetsOverview
