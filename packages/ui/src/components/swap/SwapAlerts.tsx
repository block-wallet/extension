import React from "react"
import Alert from "../ui/Alert"
import ErrorMessage from "../error/ErrorMessage"
import RefreshLabel from "../swaps/RefreshLabel"
import { classnames } from "../../styles"

interface SwapAlertsProps {
    errorMessage?: string
    priceImpactWarning: boolean
    pricePercentageImpact?: number
    shouldWarnPriceDiff: boolean
    remainingSuffix: string
    isFetchingSwaps: boolean
    onPriceImpactClick: () => void
    onPriceDiffClick: () => void
}

const SwapAlerts: React.FC<SwapAlertsProps> = ({
    errorMessage,
    priceImpactWarning,
    pricePercentageImpact,
    shouldWarnPriceDiff,
    remainingSuffix,
    isFetchingSwaps,
    onPriceImpactClick,
    onPriceDiffClick
}) => {
    if (isFetchingSwaps) {
        return <div />
    }

    return (
        <>
            {errorMessage ? (
                <ErrorMessage>{errorMessage}</ErrorMessage>
            ) : priceImpactWarning ? (
                <Alert
                    type="warn"
                    className={classnames(
                        "p-2",
                        "font-semibold",
                        "cursor-pointer hover:opacity-50",
                        "text-left"
                    )}
                    onClick={onPriceImpactClick}
                >
                    <span>
                        {pricePercentageImpact ? (
                            <span>
                                High price impact! More than{" "}
                                {(pricePercentageImpact * 100).toFixed(2)}% loss
                            </span>
                        ) : (
                            <span>
                                Unable to calculate the price impact
                            </span>
                        )}
                    </span>
                </Alert>
            ) : shouldWarnPriceDiff ? (
                <Alert
                    type="warn"
                    className={classnames(
                        "p-2",
                        "font-semibold",
                        "cursor-pointer hover:opacity-50",
                        "text-left"
                    )}
                    onClick={onPriceDiffClick}
                >
                    <span>Price difference is too big</span>
                </Alert>
            ) : null}

            {remainingSuffix && (
                <RefreshLabel
                    value={remainingSuffix}
                    className="pb-1"
                />
            )}
        </>
    )
}

export default SwapAlerts
