import { FC } from "react"
import { TokenWithBalance } from "../../context/hooks/useTokensList"
import TokenDisplay from "../token/TokenDisplay"
import plusIcon from "../../assets/images/icons/plus.svg"
import { ActionButton } from "../button/ActionButton"

const AssetsDropdownList: FC<{
    setActive?: () => void
    onAssetClick: (asset: TokenWithBalance, setActive?: () => void) => void
    selectedAddress?: string
    assets: TokenWithBalance[]
    searchValue: string | null
    addTokenState: any
    register: any
}> = ({
    onAssetClick,
    setActive,
    selectedAddress,
    assets,
    searchValue,
    addTokenState,
    register,
}) => {
    return (
        <div className="pb-6">
            <input
                readOnly
                name="asset"
                ref={register ? register.ref : null}
                className="hidden"
                value={selectedAddress}
            />
            {assets.map((asset) => {
                return (
                    <div
                        className="cursor-pointer"
                        key={asset.token.address}
                        onClick={() => onAssetClick(asset, setActive)}
                    >
                        <TokenDisplay
                            data={{
                                ...asset.token,
                            }}
                            clickable={false}
                            active={selectedAddress === asset.token.address}
                            hoverable={true}
                            balance={asset.balance}
                        />
                    </div>
                )
            })}
            {searchValue && assets.length === 0 && (
                <div className="px-3">
                    <p className="text-xs text-black text-center p-4">
                        The asset couldn&#8217;t be found, try adding it
                        manually.
                    </p>
                    <ActionButton
                        icon={plusIcon}
                        label="Add Token"
                        to="/settings/tokens/add"
                        state={{
                            addTokenState,
                            searchValue,
                        }}
                    />
                </div>
            )}
        </div>
    )
}

export default AssetsDropdownList
