import { ActionButton } from "../button/ActionButton"
import plus from "../../assets/images/icons/plus.svg"
import AssetsList from "./AssetsList"
import classnames from "classnames"
import { useTokensList } from "../../context/hooks/useTokensList"
import { useBlankState } from "../../context/background/backgroundHooks"
import AssetsLoadingSkeleton from "../skeleton/AssetsLoadingSkeleton"

const AddTokenButton = ({ fixed }: { fixed: boolean }) => {
    return (
        <div
            className={classnames(fixed ? "fixed bottom-6" : "py-4", "w-full")}
        >
            <div className="flex flex-col px-6">
                <ActionButton
                    icon={plus}
                    label="Add Token"
                    to="/settings/tokens/add"
                />
            </div>
        </div>
    )
}

const AssetsOverview = () => {
    const { currentNetworkTokens, nativeToken } = useTokensList()
    const { isNetworkChanging } = useBlankState()!
    const tokens = [nativeToken].concat(currentNetworkTokens)

    const displayFixedButton = tokens.length < 3

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
                "flex flex-col w-full justify-between overflow-y-auto hide-scroll max-h-[470px] min-h-[470px]",
                displayFixedButton ? "flex-col-reverse" : "flex-col"
            )}
            data-testid="assets-list"
        >
            <AddTokenButton fixed={displayFixedButton} />
            <AssetsList />
        </div>
    )
}

export default AssetsOverview
