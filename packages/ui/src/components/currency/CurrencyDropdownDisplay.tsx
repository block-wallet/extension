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
                    "flex items-center w-full text-base font-semibold space-x-2 text-gray-900 dark:text-gray-100"
                )}
            >
                <Spinner size="24" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{loadingText}</span>
            </div>
        )
    }

    return selectedCurrency ? (
        <div className="flex text-base font-semibold text-gray-900 dark:text-white">
            {selectedCurrency.symbol && (
                <div
                    className={classnames(
                        Classes.smallRoundedFilledIcon,
                        "mr-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200"
                    )}
                >
                    {selectedCurrency.symbol}
                </div>
            )}
            <span className="text-gray-900 dark:text-white">{selectedCurrency.code.toUpperCase()}</span>
        </div>
    ) : (
        <div className="flex flex-col justify-center w-full">
            <div className="text-base font-semibold text-gray-900 dark:text-white">Select currency</div>
        </div>
    )
}

export default CurrencyDropdownDisplay
