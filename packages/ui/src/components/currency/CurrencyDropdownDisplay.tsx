import { FC } from "react"
import { Currency } from "@block-wallet/background/utils/currency"
import cash from "../../assets/images/icons/cash.svg"
import { capitalize } from "../../util/capitalize"
import { formatName } from "../../util/formatAccount"

interface CurrencyDropdownDisplayProps {
    selectedCurrency?: Currency
    displayIcon?: boolean
}

const CurrencyDropdownDisplay: FC<CurrencyDropdownDisplayProps> = ({
    selectedCurrency,
    displayIcon,
}) => {
    return selectedCurrency ? (
        <div className="flex flex-row flex-grow justify-between items-center">
            {displayIcon && (
                <span className="mr-2">{selectedCurrency.code}</span>
            )}
            <div className="flex flex-grow justify-between space-x-1">
                <div className="flex flex-col justify-center">
                    <div className="text-base font-semibold">
                        <span className="flex">
                            {selectedCurrency.code.toUpperCase()}
                        </span>
                        {selectedCurrency.name && (
                            <span className="font-normal text-xs">
                                {formatName(
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
