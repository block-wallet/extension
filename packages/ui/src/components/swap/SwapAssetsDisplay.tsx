import React from "react"
import { BigNumber } from "@ethersproject/bignumber"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import AssetAmountDisplay from "../assets/AssetAmountDisplay"
import arrowDown from "../../assets/images/icons/arrow_down_long.svg"

interface SwapAssetsDisplayProps {
    fromToken: Token
    toToken: Token
    fromAmount: BigNumber
    toAmount: BigNumber
}

const SwapAssetsDisplay: React.FC<SwapAssetsDisplayProps> = ({
    fromToken,
    toToken,
    fromAmount,
    toAmount
}) => {
    return (
        <>
            <AssetAmountDisplay
                asset={fromToken}
                amount={fromAmount}
            />

            <div className="flex justify-center items-center py-5">
                <div className="flex justify-center items-center mx-auto rounded-full w-8 h-8 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <img
                        src={arrowDown}
                        className="h-4 w-auto mx-auto dark:invert"
                        alt="arrow"
                    />
                </div>
            </div>

            <AssetAmountDisplay
                asset={toToken}
                amount={toAmount}
            />
        </>
    )
}

export default SwapAssetsDisplay
