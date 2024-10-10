import { FC } from "react"
import { Currency } from "@block-wallet/background/utils/currency"
import CurrencyDisplay from "./CurrencyDisplay"

const CurrencyList: FC<{
    setActive?: () => void
    onCurrencyClick: (currency: Currency, setActive?: () => void) => void
    selectedCurrency?: string
    currencies: Currency[]
    searchValue: string | null
    register: any
}> = ({
    onCurrencyClick,
    setActive,
    selectedCurrency,
    currencies,
    searchValue,
    register,
}) => {
    return (
        <div className="pb-6">
            <input
                readOnly
                name="currency"
                ref={register ? register.ref : null}
                className="hidden"
                value={selectedCurrency}
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
                            clickable={false}
                            active={selectedCurrency === currency.code}
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
