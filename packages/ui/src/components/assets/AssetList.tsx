import { FC, Dispatch, SetStateAction } from "react"
import { TokenWithBalance } from "../../context/hooks/useTokensList"
import TokenDisplay from "../token/TokenDisplay"
import plusIcon from "../../assets/images/icons/plus.svg"
import { ActionButton } from "../button/ActionButton"
import { FixedSizeList as List } from 'react-window';
import React from 'react';

const ROW_HEIGHT = 56;

const AssetList: FC<{
    setActive?: Dispatch<SetStateAction<boolean>>
    onAssetClick: (asset: TokenWithBalance, setActive?: Dispatch<SetStateAction<boolean>>) => void
    selectedAddress?: string
    assets: TokenWithBalance[]
    searchValue: string | null
    addTokenState: any
    register: any
    dropdownWidth?: number | string
    dropdownHeight?: number
}> = ({
    onAssetClick,
    setActive,
    selectedAddress,
    assets,
    searchValue,
    addTokenState,
    register,
    dropdownWidth = 300,
    dropdownHeight = 250
}) => {

        const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
            // Safety check: ensure assets array has items and index is valid
            if (!assets || index < 0 || index >= assets.length) return null;

            const asset = assets[index];
            if (!asset) return null;
            return (
                <div
                    style={style}
                    className="cursor-pointer w-full box-border"
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
            );
        };

        return (
            <div className="pb-1">
                <input
                    readOnly
                    name="asset"
                    ref={register ? register.ref : null}
                    className="hidden"
                    value={selectedAddress}
                />
                {assets.length > 0 && (
                    <List
                        height={dropdownHeight}
                        itemCount={assets.length}
                        itemSize={ROW_HEIGHT}
                        width={dropdownWidth}
                        itemKey={(index) => assets[index]?.token?.address || `asset-${index}`}
                    >
                        {Row}
                    </List>
                )}
                {searchValue && assets.length === 0 && (
                    <div className="px-3 py-4" style={{ width: dropdownWidth }}>
                        <p className="text-xs text-gray-700 dark:text-gray-300 text-center mb-3">
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

export default AssetList
