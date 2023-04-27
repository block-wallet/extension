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
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import TokenDropdownDisplay from "./TokenDropdownDisplay"
import TokenList from "./TokenList"
import { Network } from "@block-wallet/background/utils/constants/networks"
import Spinner from "../spinner/Spinner"

interface TokenSelectionProps {
    onTokenChange: (token: Token) => void
    selectedToken?: Token
    displayIcon?: boolean
    topMargin?: number
    bottomMargin?: number
    popupMargin?: number
    dropdownWidth?: string
    popUpOpenLeft?: boolean
    defaultTokenList: Token[]
}

const SEARCH_LIMIT = 20

export const TokenSelection: FC<TokenSelectionProps> = ({
    onTokenChange,
    selectedToken,
    displayIcon = false,
    topMargin,
    bottomMargin,
    popupMargin,
    dropdownWidth,
    popUpOpenLeft,
    defaultTokenList,
}) => {
    const [searchResult, setSearchResult] = useState<Token[]>([])
    const [search, setSearch] = useState<string | null>(null)
    const tokenList = defaultTokenList

    const searchTokenInList = (searchedValue: string) => {
        return tokenList.filter((token) => {
            return (
                token.name.toLowerCase().includes(searchedValue) ||
                token.symbol.toLowerCase().includes(searchedValue) ||
                token.address.toLowerCase() === searchedValue
            )
        })
    }

    useEffect(() => {
        const searchAll = () => {
            if (!search) {
                setSearchResult(tokenList)
                return
            }

            const input = search.toLowerCase()
            let searchRes = searchTokenInList(input)

            searchRes = searchRes.filter((t) => !!t.symbol)

            // Order search
            let searchResult: Token[] = []

            // Limit the results
            const searchLength =
                searchRes.length > SEARCH_LIMIT
                    ? SEARCH_LIMIT
                    : searchRes.length

            for (let index = 0; index < searchLength; index++) {
                searchResult.push(searchRes[index] as Token)
                continue
            }

            setSearchResult(searchResult)
        }
        searchAll()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, tokenList])

    const onSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        let value: string | null = event.target.value

        value = value.replace(/\W/g, "")

        if (!value) {
            value = null
        }

        setSearch(value)
    }

    const onTokenClick = async (
        token: Token,
        setActive?: Dispatch<SetStateAction<boolean>>
    ) => {
        onTokenChange(token)
        setActive && setActive(false)
    }

    return (
        <DropDownSelector
            display={
                <TokenDropdownDisplay
                    selectedToken={selectedToken}
                    displayIcon={displayIcon}
                />
            }
            topMargin={topMargin || 0}
            bottomMargin={bottomMargin || 0}
            popupMargin={popupMargin || 16}
            customWidth={dropdownWidth}
            popUpOpenLeft={popUpOpenLeft}
        >
            {searchResult.length > 0 ? (
                <>
                    <div className="w-full p-3">
                        <SearchInput
                            name="tokenName"
                            placeholder="Search tokens by name or address"
                            disabled={false}
                            autoFocus={true}
                            onChange={onSearchInputChange}
                            defaultValue={search ?? ""}
                        />
                    </div>
                    <TokenList
                        tokens={searchResult}
                        onTokenClick={onTokenClick}
                        searchValue={search}
                        selectedSymbol={selectedToken?.symbol}
                    />
                </>
            ) : (
                <div className="flex h-10 justify-center items-center">
                    <Spinner color={"black"} size={"24"} />
                </div>
            )}
        </DropDownSelector>
    )
}
