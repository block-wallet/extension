import { useMemo, useState } from "react"
import { TokenWithBalance } from "../../../context/hooks/useTokensList"

const matchByTerm =
    (term?: string) =>
    (token: TokenWithBalance): boolean => {
        if (!term) return true

        return (
            token.token.address.includes(term) ||
            token.token.symbol.toLowerCase().includes(term) ||
            token.token.name.toLowerCase().includes(term)
        )
    }

const filterTokens = (tokens: TokenWithBalance[], term?: string) => {
    return tokens.filter(matchByTerm(term))
}

const useTokenSearch = (tokens: TokenWithBalance[]) => {
    const [search, setSearch] = useState("")
    const result = useMemo(() => {
        return filterTokens(tokens, search.toLowerCase())
    }, [search, tokens])
    return {
        tokensResult: result,
        search,
        onChangeSearch: setSearch,
    }
}

export default useTokenSearch
