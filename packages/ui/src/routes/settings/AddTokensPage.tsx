import { useState, useEffect } from "react"

// Components
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import SearchInput from "../../components/input/SearchInput"
import CustomTokenView from "../../components/token/TokenCustomView"
import SearchedTokenView from "../../components/token/TokenSearchView"

// Comm
import { searchTokenInAssetsList } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

// Assets
import { utils } from "ethers/lib/ethers"
import PopupFooter from "../../components/popup/PopupFooter"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"

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

    // State
    const [results, setResults] = useState<TokenResponse[]>([])
    const [isCustomTokenView, setIsCustomTokenView] = useState<boolean>(false)
    const [tokenAddress, setTokenAddress] = useState<string>("")
    const [isSearchEmpty, setIsSearchEmpty] = useState<boolean>(true)
    const [submitEnabled, setSubmitEnabled] = useState<boolean>(false)
    const [searchedValue, setSearchedValue] = useState<string>("")

    useEffect(() => {
        if (results) {
            setIsCustomTokenView(false)
        } else {
            setIsCustomTokenView(true)
        }
        setTokenAddress("")
    }, [results])
    const [submitForm, setSubmitForm] = useState<boolean>(false)

    const onChange = (value: string) => {
        // Update input value & check if empty
        value === "" ? setIsSearchEmpty(true) : setIsSearchEmpty(false)
        setSearchedValue(value)

        // If user puts address - show custom token view
        if (value) {
            if (utils.isAddress(value)) {
                setIsCustomTokenView(true)
                setTokenAddress(value)
                // setSelected([])
            } else if (/^[a-zA-Z0-9_.-]{3,}$/.test(value)) {
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

    const onSubmit = async () => {
        setSubmitForm(submitEnabled)
    }

    const handleSubmitEnabled = async (value: boolean) => {
        setSubmitEnabled(value)
    }

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
            submitOnEnter={{ onSubmit, isEnabled: submitEnabled }}
        >
            <div className="flex flex-col flex-1 w-full">
                <div className="h-full max-h-screen overflow-auto hide-scroll">
                    {/* INPUT */}
                    <div className="w-full p-6 pb-2 bg-white fixed z-20">
                        <SearchInput
                            // {...register("tokenName")}
                            name="tokenName"
                            placeholder="Search Tokens by name or fill in Address"
                            disabled={false}
                            onChange={(e: any) => onChange(e.target.value)}
                            autoFocus={true}
                            debounced
                            minSearchChar={3}
                            defaultValue={history.location.state?.searchValue}
                            // error={errors.tokenName?.message}
                        />
                    </div>

                    {!isCustomTokenView ? (
                        <SearchedTokenView
                            isSearchEmpty={isSearchEmpty}
                            results={results}
                            searchedValue={searchedValue}
                            setSubmitEnabled={handleSubmitEnabled}
                            submitForm={submitForm}
                        />
                    ) : (
                        <CustomTokenView
                            customTokenAddress={tokenAddress}
                            submitForm={submitForm}
                            setSubmitEnabled={handleSubmitEnabled}
                        />
                    )}
                </div>
                <hr className="border-0.5 border-gray-200 w-full" />
                {/* FOOTER */}
                <PopupFooter>
                    <ButtonWithLoading
                        label="Next"
                        disabled={!submitEnabled}
                        onClick={onSubmit}
                    />
                </PopupFooter>
            </div>
        </PopupLayout>
    )
}

export default AddTokensPage
