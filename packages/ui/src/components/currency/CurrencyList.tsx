import { FC } from "react"
import { Currency } from "@block-wallet/background/utils/currency"
import CurrencyDisplay from "./CurrencyDisplay"

const CurrencyList: FC<{
    setActive?: () => void
    onCurrencyClick: (currency: Currency, setActive?: () => void) => void
    selectedCurrencyName?: string
    currencies: Currency[]
    searchValue: string | null
}> = ({
    onCurrencyClick,
    setActive,
    selectedCurrencyName,
    currencies,
    searchValue,
}) => {
    return (
        <div className="pb-6">
            <input
                readOnly
                name="asset"
                className="hidden"
                value={selectedCurrencyName}
            />
            {currencies.map((currency) => {
                return (
                    <div
                        className="cursor-pointer"
                        key={currency.code}
                        onClick={() => onCurrencyClick(currency, setActive)}
                    >
                        <CurrencyDisplay
                            data={currency}
                            active={selectedCurrencyName === currency.name}
                            clickable={false}
                            hoverable={true}
                        />
                    </div>
                )
            })}
            {searchValue && currencies.length === 0 && (
                <div className="px-3">
                    <p className="text-xs text-primary-black-default text-center p-4">
                        The currency couldn&#8217;t be found.
                    </p>
                </div>
            )}
        </div>
    )
}

export default CurrencyList
