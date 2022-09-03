import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"

// Components
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import SearchInput from "../../components/input/SearchInput"
import CustomTokenView from "../../components/token/TokenCustomView"
import SearchedTokenView from "../../components/token/TokenSearchView"

// Utils
import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"

// Comm
import { searchTokenInAssetsList } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

// Assets
import { utils } from "ethers/lib/ethers"

// Types
export type TokenResponse = {
    address: string
    decimals: number | undefined
    logo: string
    name: string
    symbol: string
    type: string
}

// Main component
const AddTokensPage = () => {
    const history = useOnMountHistory()
    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Add Tokens"
                    onClose={(e) => {
                        e.preventDefault()
                        history.push("/")
                    }}
                    onBack={(e) => {
                        e.preventDefault()
                        const state =
                            history.location.state?.addTokenState || {}
                        if (state.redirectTo) {
                            history.replace({
                                pathname: state.redirectTo,
                                state,
                            })
                        } else {
                            history.replace("/")
                        }
                    }}
                />
            }
        >
            <div className="flex flex-col flex-1 w-full">
                <SearchToken />
            </div>
        </PopupLayout>
    )
}

// Schema
const searchTokenSchema = yup.object().shape({
    tokenName: yup
        .string()
        .test("is-empty", "Token name is empty", (s) => {
            return !!s && s.trim().length > 0
        })
        .required("Please enter a token name"),
})
type searchTokenFormData = { tokenName: string }

// Sub components
const SearchToken = () => {
    const history = useOnMountHistory()
    const { register } = useForm<searchTokenFormData>({
        resolver: yupResolver(searchTokenSchema),
    })
    // State
    const [results, setResults] = useState<TokenResponse[]>([])
    const [isCustomTokenView, setIsCustomTokenView] = useState<boolean>(false)
    const [tokenAddress, setTokenAddress] = useState<string>("")
    const [isSearchEmpty, setIsSearchEmpty] = useState<boolean>(true)

    useEffect(() => {
        if (results) {
            setIsCustomTokenView(false)
        } else {
            setIsCustomTokenView(true)
        }
        setTokenAddress("")
    }, [results])

    let searchedValue = ""
    const onChange = (value: string) => {
        // Update input value & check if empty
        value === "" ? setIsSearchEmpty(true) : setIsSearchEmpty(false)

        // If user puts address - show custom token view
        if (value) {
            if (utils.isAddress(value)) {
                setIsCustomTokenView(true)
                setTokenAddress(value)
                // setSelected([])
            } else if (/^[a-zA-Z0-9_.-]{3,}$/.test(value)) {
                searchedValue = value
                // Accept only number, letters and - . _
                searchTokenInAssetsList(value.toUpperCase())
                    .then((res) => {
                        const exacts = res.filter(
                            (r) =>
                                r.symbol.toLowerCase() === value.toLowerCase()
                        )
                        const others = res.filter(
                            (r) =>
                                r.symbol.toLowerCase() !== value.toLowerCase()
                        )

                        return setResults([...exacts, ...others])
                    })
                    .catch((err) => console.log(err))
            } else {
                setResults([])
            }
        } else {
            setResults([])
        }
    }

    useEffect(() => {
        if (history.location.state?.searchValue) {
            onChange(history.location.state?.searchValue)
        }
    }, [history.location.state?.searchValue])

    return (
        <>
            <div
                id="search-form"
                className={`flex flex-col justify-between w-full ${
                    !isCustomTokenView ? " h-full" : ""
                } `}
            >
                <div className="flex-1 flex flex-col w-full h-0 max-h-screen overflow-auto hide-scroll">
                    <div className="flex flex-col flex-1 w-full">
                        <div
                            className={` ${
                                !isCustomTokenView ? "h-full" : "mb-6"
                            } `}
                        >
                            {/* INPUT */}
                            <div className="w-full p-6 pb-2 bg-white fixed z-20">
                                <SearchInput
                                    {...register("tokenName")}
                                    name="tokenName"
                                    placeholder="Search Tokens by name or fill in Address"
                                    disabled={false}
                                    onChange={(e: any) =>
                                        onChange(e.target.value)
                                    }
                                    autoFocus={true}
                                    debounced
                                    minSearchChar={3}
                                    defaultValue={
                                        history.location.state?.searchValue
                                    }
                                />
                            </div>

                            {/* {!isCustomTokenView ? (
                                
                            ) : (
                                <></>
                            )} */}
                        </div>
                    </div>
                </div>
                {!isCustomTokenView ? (
                    <SearchedTokenView
                        isSearchEmpty={isSearchEmpty}
                        results={results}
                        searchedValue={searchedValue}
                    />
                ) : (
                    <></>
                )}
            </div>
            {isCustomTokenView ? (
                <CustomTokenView customTokenAddress={tokenAddress} />
            ) : (
                <></>
            )}
        </>
    )
}

export default AddTokensPage
