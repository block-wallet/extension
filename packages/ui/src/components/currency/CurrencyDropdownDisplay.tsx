import { FC } from "react"
import { Currency } from "@block-wallet/background/utils/currency"
import { formatName } from "../../util/formatAccount"
import { capitalize } from "../../util/capitalize"
import Spinner from "../spinner/Spinner"
import { classnames } from "../../styles"

interface CurrencyDropdownDisplayProps {
    selectedCurrency?: Currency
    isLoading?: boolean
    loadingText?: string
    showFullName?: boolean
}

const CurrencyDropdownDisplay: FC<CurrencyDropdownDisplayProps> = ({
    selectedCurrency,
    loadingText = "",
    isLoading,
    showFullName = false,
}) => {
    if (isLoading) {
        return (
            <div
                className={classnames(
                    "flex items-center w-full text-base font-semibold space-x-2",
                    !loadingText && "justify-center"
                )}
            >
                <Spinner size="24" />
                <span>{loadingText}</span>
            </div>
        )
    }

    return selectedCurrency ? (
        <div className="flex flex-row flex-grow justify-between items-center">
            <div className="flex flex-grow justify-between space-x-1">
                <div className="flex flex-col justify-center">
                    <div className="text-base font-semibold">
                        <span className="flex">
                            {selectedCurrency.code.toUpperCase()}
                        </span>
                        {selectedCurrency.name && (
                            <span className="font-normal text-xs">
                                {showFullName
                                    ? capitalize(selectedCurrency.name)
                                    : formatName(
                                          capitalize(selectedCurrency.name),
                                          16
                                      )}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    ) : (
        <div className="flex flex-col justify-center w-full">
            <div className="text-base font-semibold">Select currency</div>
        </div>
    )
}

export default CurrencyDropdownDisplay
