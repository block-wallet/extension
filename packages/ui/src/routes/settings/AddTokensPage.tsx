import { useState, useEffect } from "react"

import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import SearchInput from "../../components/input/SearchInput"
import AddTokenManualView from "../../components/token/AddTokenManualView"
import AddTokenListView from "../../components/token/AddTokenListView"

import { searchTokenInAssetsList } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

import { isAddress } from "@ethersproject/address"
import PopupFooter from "../../components/popup/PopupFooter"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import useLocalStorageState from "../../util/hooks/useLocalStorageState"
import log from "loglevel"

export type TokenResponse = {
    address: string
    decimals: number | undefined
    logo: string
    name: string
    symbol: string
    type: string
}

const AddTokensPage = () => {
    const history = useOnMountHistory()

    const [results, setResults] = useState<TokenResponse[]>([])
    const [submitEnabled, setSubmitEnabled] = useState<boolean>(false)
    const [searchedValue, setSearchedValue] = useLocalStorageState<string>(
        "addTokenSearch",
        { initialValue: history.location.state?.searchValue ?? "" }
    )

    const isManualTokenView = isAddress(searchedValue)
    useEffect(() => {
        if (searchedValue && !isManualTokenView) {
            if (/^[a-zA-Z0-9_.-]{3,}$/.test(searchedValue)) {
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
                    .catch((err) => log.error(err))
            } else {
                setResults([])
            }
        } else {
            setResults([])
        }
    }, [searchedValue, isManualTokenView])

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
            showProviderStatus
            footer={
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
                        buttonClass="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-md"
                    />
                </PopupFooter>
            }
        >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-green-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-green-900/10"></div>
            <div className="relative z-10 flex flex-col flex-1 w-full h-full">
                <div className="h-full max-h-screen overflow-auto">
                    <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50">
                        <div className="p-6 pb-4">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    {isManualTokenView ? "Add Custom Token" : "Search Tokens"}
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {isManualTokenView
                                        ? "Enter token contract details to add a custom token"
                                        : "Search for tokens by name or enter a contract address"
                                    }
                                </p>
                            </div>

                            <div className="relative">
                                <SearchInput
                                    name="tokenName"
                                    placeholder={isManualTokenView
                                        ? "Contract address detected - fill in details below"
                                        : "Search tokens by name or enter contract address"
                                    }
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
                        </div>
                    </div>

                    <div className="flex-1">
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
                </div>
            </div>
        </PopupLayout>
    )
}

export default AddTokensPage
