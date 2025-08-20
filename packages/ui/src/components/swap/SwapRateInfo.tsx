import React from "react"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { formatNumberLength } from "../../util/formatNumberLength"
import { formatRounded } from "../../util/formatRounded"
import { formatCurrency } from "../../util/formatCurrency"

interface UsdValueDiff {
    percent?: number
    absolute?: number
}

interface SwapRateInfoProps {
    fromToken: Token
    toToken: Token
    exchangeRate: number
    usdValueDiff: UsdValueDiff
    shouldWarnPriceDiff: boolean
    onPriceDiffClick: () => void
}

const SwapRateInfo: React.FC<SwapRateInfoProps> = ({
    fromToken,
    toToken,
    exchangeRate,
    usdValueDiff,
    shouldWarnPriceDiff,
    onPriceDiffClick
}) => {
    return (
        <>
            <p className="text-sm py-1 leading-loose text-gray-600 dark:text-gray-400 uppercase text-center w-full">
                {`1 ${fromToken.symbol} = ${formatNumberLength(
                    formatRounded(exchangeRate.toFixed(10), 8),
                    10
                )} ${toToken.symbol}`}
            </p>

            <p
                className="text-[13px] pb-1 pt-0.5 text-gray-700 dark:text-gray-300 text-center cursor-pointer"
                onClick={() => {
                    if (shouldWarnPriceDiff) onPriceDiffClick()
                }}
                title={shouldWarnPriceDiff ? "Price difference is too big" : undefined}
            >
                Value diff {usdValueDiff.percent !== undefined
                    ? `${(usdValueDiff.percent * 100).toFixed(2)}%`
                    : "–"} {usdValueDiff.absolute !== undefined
                        ? `(${formatCurrency(Math.abs(usdValueDiff.absolute), { showSymbol: true, showCurrency: false })})`
                        : ""}
            </p>
        </>
    )
}

export default SwapRateInfo
