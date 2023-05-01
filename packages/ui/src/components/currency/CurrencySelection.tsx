import DropDownSelector from "../input/DropDownSelector"
import SearchInput from "../input/SearchInput"
import {
    ChangeEvent,
    Dispatch,
    FC,
    SetStateAction,
    useEffect,
    useState,
} from "react"
import { Currency } from "@block-wallet/background/utils/currency"
import CurrencyList from "./CurrencyList"
import CurrencyDropdownDisplay from "./CurrencyDropdownDisplay"

interface CurrencySelectionProps {
    defaultCurrencyList: Currency[]
    onCurrencyChange: (currency: Currency) => void
    selectedCurrency?: Currency
    error?: string
    register?: any
    topMargin?: number
    bottomMargin?: number
    popupMargin?: number
    dropdownWidth?: string
    popUpOpenLeft?: boolean
}

export const CurrencySelection: FC<CurrencySelectionProps> = ({
    defaultCurrencyList,
    onCurrencyChange,
    selectedCurrency,
    error,
    topMargin,
    bottomMargin,
    popupMargin,
    dropdownWidth,
    register,
    popUpOpenLeft,
}) => {
    const [searchResult, setSearchResult] = useState<Currency[]>([])
    const [search, setSearch] = useState<string | null>(null)
    const [currencyList, setCurrencyList] = useState<Currency[]>([])

    useEffect(() => {
        if (!currencyList.length) {
            setCurrencyList(defaultCurrencyList)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultCurrencyList])

    useEffect(() => {
        const result = currencyList.filter(({ name, code }: Currency) => {
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
    }, [search, currencyList])

    const onSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        let value: string | null = event.target.value

        value = value.replace(/\W/g, "")

        if (!value) {
            value = null
        }

        setSearch(value)
    }

    const onCurrencyClick = async (
        currency: Currency,
        setActive?: Dispatch<SetStateAction<boolean>>
    ) => {
        onCurrencyChange(currency)
        setActive && setActive(false)
    }

    return (
        <DropDownSelector
            display={
                <CurrencyDropdownDisplay
                    selectedCurrency={selectedCurrency}
                    isLoading={!currencyList || currencyList.length === 0}
                    loadingText="Loading currencies..."
                />
            }
            error={error}
            topMargin={topMargin || 0}
            bottomMargin={bottomMargin || 0}
            popupMargin={popupMargin || 16}
            customWidth={dropdownWidth}
            popUpOpenLeft={popUpOpenLeft}
            disabled={!currencyList || currencyList.length === 0}
        >
            <div className="w-full p-3">
                <SearchInput
                    name="currencyName"
                    placeholder="Search currency by name"
                    disabled={false}
                    autoFocus={true}
                    onChange={onSearchInputChange}
                    defaultValue={search ?? ""}
                />
            </div>
            <CurrencyList
                currencies={searchResult}
                onCurrencyClick={onCurrencyClick}
                register={register}
                searchValue={search}
                selectedCurrency={selectedCurrency?.code}
            />
        </DropDownSelector>
    )
}
