import { FC } from "react"
import { Currency } from "@block-wallet/background/utils/currency"
import Spinner from "../spinner/Spinner"
import { Classes, classnames } from "../../styles"

interface CurrencyDropdownDisplayProps {
    selectedCurrency?: Currency
    isLoading?: boolean
    loadingText?: string
}

const CurrencyDropdownDisplay: FC<CurrencyDropdownDisplayProps> = ({
    selectedCurrency,
    loadingText = "",
    isLoading,
}) => {
    if (isLoading) {
        return (
            <div
                className={classnames(
                    "flex items-center w-full text-base font-semibold space-x-2"
                )}
            >
                <Spinner size="24" />
                <span className="text-sm">{loadingText}</span>
            </div>
        )
    }

    return selectedCurrency ? (
        <div className="flex text-base font-semibold">
            {selectedCurrency.symbol && (
                <div className={classnames(Classes.roundedSmallIcon, "mr-2")}>
                    {selectedCurrency.symbol}
                </div>
            )}
            <span>{selectedCurrency.code.toUpperCase()}</span>
        </div>
    ) : (
        <div className="flex flex-col justify-center w-full">
            <div className="text-base font-semibold">Select currency</div>
        </div>
    )
}

export default CurrencyDropdownDisplay
