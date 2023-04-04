import { formatUnits } from "@ethersproject/units"
import { FC } from "react"
import classnames from "classnames"
import { formatNumberLength } from "../../util/formatNumberLength"
import { formatRounded } from "../../util/formatRounded"
import TokenLogo from "../token/TokenLogo"
import { BigNumber } from "@ethersproject/bignumber"
import { TokenWithBalance } from "../../context/hooks/useTokensList"

interface AssetDropdownDisplayProps {
    selectedAsset?: TokenWithBalance
    customAmount?: BigNumber
    displayIcon?: boolean
    assetBalanceClassName?: string
    assetBalance?: string
}

const AssetDropdownDisplay: FC<AssetDropdownDisplayProps> = ({
    selectedAsset,
    displayIcon,
    customAmount,
    assetBalance,
    assetBalanceClassName,
}) => {
    return selectedAsset ? (
        <div className="flex flex-row flex-grow justify-between items-center">
            {displayIcon && (
                <TokenLogo
                    logo={selectedAsset.token.logo}
                    name={selectedAsset.token.name}
                    className="mr-2"
                />
            )}
            <div className="flex flex-grow justify-between space-x-1">
                <div className="flex flex-col justify-center">
                    <span className="text-base font-semibold">
                        {selectedAsset.token.symbol}
                    </span>
                    {!customAmount && (
                        <span
                            title={assetBalance}
                            className={classnames(
                                "text-xs text-primary-grey-dark mt-1 truncate",
                                assetBalanceClassName
                            )}
                        >
                            {assetBalance}
                        </span>
                    )}
                </div>
                {customAmount && (
                    <span
                        className="text-base font-semibold ml-auto mr-2 truncate max-w-lg"
                        title={customAmount?.toString()}
                        style={{ maxWidth: "8.5rem" }}
                    >
                        {formatNumberLength(
                            formatRounded(
                                formatUnits(
                                    customAmount,
                                    selectedAsset.token.decimals
                                ),
                                9
                            ),
                            12
                        )}
                    </span>
                )}
            </div>
        </div>
    ) : (
        <div className="flex flex-col justify-center w-full">
            <div className="text-base font-semibold">Select token</div>
        </div>
    )
}

export default AssetDropdownDisplay
