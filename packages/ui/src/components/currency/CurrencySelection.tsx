import { Currency } from "@block-wallet/background/utils/currency"
import {
    useState,
    useEffect,
    FC,
    Dispatch,
    SetStateAction,
    ChangeEvent,
} from "react"
import { getValidCurrencies } from "../../context/commActions"
import DropDownSelector from "../input/DropDownSelector"
import CurrencyDropdownDisplay from "./CurrencyDropdownDisplay"
import SearchInput from "../input/SearchInput"
import CurrencyList from "./CurrencyList"
import { ONRAMPER_FIAT } from "../../util/onRamperUtils"

interface CurrencySelectionProps {
    onCurrencyChange?: (currency: Currency) => void
    selectedCurrency?: Currency
    displayIcon?: boolean
    error?: string
    topMargin?: number
    bottomMargin?: number
    popupMargin?: number
    dropdownWidth?: string
    useOnRamperCurrencies?: boolean
}

const CurrencySelection: FC<CurrencySelectionProps> = ({
    onCurrencyChange,
    selectedCurrency,
    displayIcon,
    error,
    topMargin,
    bottomMargin,
    popupMargin,
    dropdownWidth,
    useOnRamperCurrencies,
}) => {
    const [searchResult, setSearchResult] = useState<Currency[]>([])
    const [validCurrencies, setValidCurrencies] = useState<Currency[]>([])
    const [search, setSearch] = useState<string | null>(null)

    const onCurrencyClick = async (
        currency: Currency,
        setActive?: Dispatch<SetStateAction<boolean>>
    ) => {
        onCurrencyChange && onCurrencyChange(currency)
        setActive && setActive(false)
    }

    const onSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        let value: string | null = event.target.value

        value = value.replace(/\W/g, "")

        if (!value) {
            value = null
        }

        setSearch(value)
    }

    useEffect(() => {
        const result = validCurrencies.filter(({ name, code }: Currency) => {
            if (!search) {
                return true
            }

            const nameToSearch = name?.toUpperCase()
            const codeToSearch = code.toUpperCase()
            const uppercasedSearch = search.toUpperCase()

            return (
                nameToSearch?.includes(uppercasedSearch) ||
                codeToSearch.includes(uppercasedSearch)
            )
        })

        setSearchResult(result)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, validCurrencies])

    useEffect(() => {
        if (!useOnRamperCurrencies) {
            getValidCurrencies().then((currencies) => {
                setValidCurrencies(currencies)
            })
            setValidCurrencies(
                validCurrencies.sort((c1, c2) => {
                    const c1Name = c1.code.toLowerCase()
                    const c2Name = c2.code.toLowerCase()
                    if (c1Name > c2Name) {
                        return 1
                    }

                    if (c1Name < c2Name) {
                        return -1
                    }

                    return 0
                })
            )
        } else {
            setValidCurrencies(ONRAMPER_FIAT)
        }
    }, [])

    return (
        <DropDownSelector
            display={
                <CurrencyDropdownDisplay
                    selectedCurrency={selectedCurrency}
                    displayIcon={displayIcon}
                />
            }
            error={error}
            topMargin={topMargin || 0}
            bottomMargin={bottomMargin || 0}
            popupMargin={popupMargin || 16}
            customWidth={dropdownWidth}
        >
            <div className="w-full p-3">
                <SearchInput
                    name="currencyName"
                    placeholder="Search currencies by name"
                    disabled={false}
                    autoFocus={true}
                    onChange={onSearchInputChange}
                    defaultValue={search ?? ""}
                />
            </div>
            <CurrencyList
                currencies={searchResult}
                onCurrencyClick={onCurrencyClick}
                searchValue={search}
                selectedCurrencyName={selectedCurrency?.name}
            />
        </DropDownSelector>
    )
}

export default CurrencySelection
