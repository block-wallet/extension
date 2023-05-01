import { FC } from "react"
import { Currency } from "@block-wallet/background/utils/currency"
import { formatName } from "../../util/formatAccount"
import { capitalize } from "../../util/capitalize"

interface CurrencyDropdownDisplayProps {
    selectedCurrency?: Currency
}

const CurrencyDropdownDisplay: FC<CurrencyDropdownDisplayProps> = ({
    selectedCurrency,
}) => {
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
