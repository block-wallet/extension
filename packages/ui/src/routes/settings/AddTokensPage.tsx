import { useState, useEffect } from "react"

// Components
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import SearchInput from "../../components/input/SearchInput"
import AddTokenManualView from "../../components/token/AddTokenManualView"
import AddTokenListView from "../../components/token/AddTokenListView"

// Comm
import { searchTokenInAssetsList } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

// Assets
import { utils } from "ethers/lib/ethers"
import PopupFooter from "../../components/popup/PopupFooter"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import useLocalStorageState from "../../util/hooks/useLocalStorageState"

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
    const [submitEnabled, setSubmitEnabled] = useState<boolean>(false)
    const [searchedValue, setSearchedValue] = useLocalStorageState<string>(
        "addTokenSearch",
        { initialValue: history.location.state?.searchValue ?? "" }
    )

    const isManualTokenView = utils.isAddress(searchedValue)
    useEffect(() => {
        if (searchedValue && !isManualTokenView) {
            if (/^[a-zA-Z0-9_.-]{3,}$/.test(searchedValue)) {
                // Accept only number, letters and - . _
                searchTokenInAssetsList(searchedValue.toUpperCase())
                    .then((res) => {
                        const exacts = res.tokens.filter(
                            (r) =>
                                r.symbol.toLowerCase() ===
                                searchedValue.toLowerCase()
                        )
                        const others = res.tokens.filter(
                            (r) =>
                                r.symbol.toLowerCase() !==
                                searchedValue.toLowerCase()
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
    }, [searchedValue])

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
                    networkIndicator
                />
            }
            // submitOnEnter={{ isEnabled: submitEnabled }}
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
                            onChange={(e: any) =>
                                setSearchedValue(e.target.value)
                            }
                            autoFocus={true}
                            debounced
                            minSearchChar={3}
                            defaultValue={searchedValue}
                        />
                    </div>

                    {!isManualTokenView ? (
                        <AddTokenListView
                            results={results}
                            searchedValue={searchedValue}
                            setSubmitEnabled={handleSubmitEnabled}
                        />
                    ) : (
                        <AddTokenManualView
                            manualTokenAddress={searchedValue}
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
                        type="submit"
                        formId={
                            isManualTokenView
                                ? "manualViewForm"
                                : "listViewForm"
                        }
                    />
                </PopupFooter>
            </div>
        </PopupLayout>
    )
}

export default AddTokensPage
