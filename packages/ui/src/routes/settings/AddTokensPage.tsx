import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { FixedSizeList as List } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"

// Types
import { Token } from "@block-wallet/background/controllers/erc-20/Token"

// Context
import { useBlankState } from "../../context/background/backgroundHooks"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"

// Components
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import SearchInput from "../../components/input/SearchInput"
import TokenDisplay from "../../components/TokenDisplay"
import TextInput from "../../components/input/TextInput"

// Utils
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import * as yup from "yup"
import { InferType } from "yup"
import { yupResolver } from "@hookform/resolvers/yup"

// Comm
import { searchTokenInAssetsList } from "../../context/commActions"

// Assets
import searchIcon from "../../assets/images/icons/search.svg"
import { utils } from "ethers/lib/ethers"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import Spinner from "../../components/spinner/Spinner"

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

// Types
export type TokenResponse = {
    address: string
    decimals: number | undefined
    logo: string
    name: string
    symbol: string
    type: string
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

const customTokenSchema = yup.object({
    tokenAddress: yup
        .string()
        .test("is-empty", "Token contract address is empty", (s) => {
            return !!s && s.trim().length > 0
        })
        .required("Please enter a contract address"),
    tokenSymbol: yup
        .string()
        .test("is-empty", "Token symbol is empty", (s) => {
            return !!s && s.trim().length > 0
        })
        .required("Please enter a token symbol"),
    tokenDecimals: yup
        .string()
        .test("is-empty", "Token decimals is empty", (s) => {
            return !!s && s.trim().length > 0
        })
        .required("Please enter token decimals"),
})
type customTokenFormData = InferType<typeof customTokenSchema>

// Sub components
const SearchToken = () => {
    const history = useOnMountHistory()
    const { register } = useForm<searchTokenFormData>({
        resolver: yupResolver(searchTokenSchema),
    })
    // State
    const [isSearchEmpty, setIsSearchEmpty] = useState<boolean>(true)
    const [results, setResults] = useState<TokenResponse[]>([])
    const [selected, setSelected] = useState<TokenResponse[]>([])
    const [message, setMessage] = useState<string>("")
    const [isCustomTokenView, setIsCustomTokenView] = useState<boolean>(false)
    const [tokenAddress, setTokenAddress] = useState<string>("")

    useEffect(() => {
        if (results) {
            setIsCustomTokenView(false)
        } else {
            setIsCustomTokenView(true)
        }
        setTokenAddress("")
    }, [results])

    // Handlers
    const onSubmit = async () => {
        try {
            // Valid form data
            if (selected.length > 0) {
                history.push({
                    pathname: "/settings/tokens/add/confirm",
                    state: {
                        tokens: selected,
                        ...(history.location.state || {}),
                    },
                })
            } else {
                // Prevent manual form submission
                setMessage("Please select a token first.")
            }
        } catch (event) {
            // Invalid form data
            console.log(event)
        }
    }

    const onChange = (value: string) => {
        // Update input value & check if empty
        value === "" ? setIsSearchEmpty(true) : setIsSearchEmpty(false)

        // If user puts address - show custom token view
        if (value) {
            if (utils.isAddress(value)) {
                setIsCustomTokenView(true)
                setTokenAddress(value)
                setSelected([])
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

    const onClick = (token: TokenResponse) => {
        // Check if the token is already selected
        if (!selected.some((el) => el.address === token.address)) {
            // Add selected token
            addToken(token)

            // Reset message
            if (message !== "") {
                setMessage("")
            }
        } else {
            // Remove selected token
            removeToken(token)
        }
    }

    // Functions
    const addToken = (token: TokenResponse) => {
        setSelected(selected.concat(token))
    }

    const removeToken = (token: TokenResponse) => {
        setSelected(selected.filter((el) => el.address !== token.address))
    }

    const filteredResults = results.filter(
        (result) => !selected.some((el) => el.address === result.address)
    )

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

                            {/* ERROR */}
                            <div
                                className={`text-xs px-6 text-red-500 ${
                                    message === "" ? "pt-0 h-0" : "pt-2"
                                }`}
                            >
                                {message || <>&nbsp;</>}
                            </div>

                            <div className="w-full mt-16">
                                {!isCustomTokenView && (
                                    <>
                                        {/* HINT */}
                                        {isSearchEmpty &&
                                        selected.length <= 0 ? (
                                            <div className="flex flex-col items-center justify-start flex-1 h-full p-6">
                                                <div className="flex justify-center items-center relative mb-6">
                                                    <img
                                                        src={searchIcon}
                                                        alt="search"
                                                        className="w-7 h-7 absolute z-10"
                                                    />
                                                    <div className="w-20 h-20 bg-primary-100 rounded-full relative z-0"></div>
                                                </div>
                                                <span className="text-sm text-gray-600 text-center">
                                                    Add the tokens that you've
                                                    acquired using BlockWallet.
                                                    <br />
                                                    Enter an address for adding
                                                    a custom token.
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col w-full h-0 max-h-screen px-6 pb-0">
                                                <div
                                                    className={`text-xs text-gray-500 pt-4 pb-0 ${
                                                        selected.length <= 0
                                                            ? "hidden"
                                                            : "visible"
                                                    }`}
                                                >
                                                    SELECTED TOKENS
                                                </div>
                                                <div className="flex flex-col">
                                                    {selected.map((select) => {
                                                        // Selected tokens
                                                        return (
                                                            <div
                                                                className="cursor-pointer"
                                                                key={`selected-${select.address}`}
                                                                onClick={() =>
                                                                    onClick(
                                                                        select
                                                                    )
                                                                }
                                                            >
                                                                <TokenDisplay
                                                                    data={
                                                                        select
                                                                    }
                                                                    clickable={
                                                                        false
                                                                    }
                                                                    active={
                                                                        true
                                                                    }
                                                                    hoverable={
                                                                        true
                                                                    }
                                                                    textSize="sm"
                                                                />
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                                <div
                                                    className={`text-xs text-gray-500 pt-4 pb-1 ${
                                                        isSearchEmpty
                                                            ? "hidden"
                                                            : "visible"
                                                    }`}
                                                >
                                                    SEARCH TOKENS
                                                </div>
                                                <div className="flex flex-col">
                                                    {results.length < 1 &&
                                                    selected.length <= 0 ? (
                                                        <div className="text-base font-bold text-black w-full text-center mt-4">
                                                            No match
                                                        </div>
                                                    ) : (
                                                        <div
                                                            style={{
                                                                height: 314,
                                                            }}
                                                            className="w-full"
                                                        >
                                                            <AutoSizer>
                                                                {({
                                                                    width,
                                                                    height,
                                                                }) => (
                                                                    <List
                                                                        height={
                                                                            height
                                                                        }
                                                                        width={
                                                                            width
                                                                        }
                                                                        itemCount={
                                                                            filteredResults.length
                                                                        }
                                                                        itemSize={
                                                                            60
                                                                        }
                                                                        itemData={
                                                                            filteredResults
                                                                        }
                                                                    >
                                                                        {({
                                                                            style,
                                                                            data,
                                                                            index,
                                                                        }) => (
                                                                            <div
                                                                                style={
                                                                                    style
                                                                                }
                                                                                className="cursor-pointer"
                                                                                key={`result-${data[index].address}`}
                                                                                onClick={() =>
                                                                                    onClick(
                                                                                        data[
                                                                                            index
                                                                                        ]
                                                                                    )
                                                                                }
                                                                            >
                                                                                <TokenDisplay
                                                                                    data={
                                                                                        data[
                                                                                            index
                                                                                        ]
                                                                                    }
                                                                                    clickable={
                                                                                        false
                                                                                    }
                                                                                    active={
                                                                                        false
                                                                                    }
                                                                                    hoverable={
                                                                                        true
                                                                                    }
                                                                                    textSize="sm"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </List>
                                                                )}
                                                            </AutoSizer>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {isCustomTokenView ? (
                <CustomToken customTokenAddress={tokenAddress} />
            ) : (
                <>
                    <hr className="border-0.5 border-gray-200 w-full" />

                    {/* FOOTER */}
                    <PopupFooter>
                        <ButtonWithLoading
                            label="Next"
                            formId="search-form"
                            disabled={selected.length === 0}
                            onClick={onSubmit}
                        />
                    </PopupFooter>
                </>
            )}
        </>
    )
}

const CustomToken = (props: any) => {
    const history = useOnMountHistory()
    const { customTokenAddress } = props

    const { userTokens } = useBlankState()!
    const account = useSelectedAccount()
    const network = useSelectedNetwork()
    const tokens =
        userTokens &&
        userTokens[account.address] &&
        userTokens[account.address][network.chainId]
            ? userTokens[account.address][network.chainId]
            : {}

    const tokenAddresses = useRef(
        Object.keys(tokens ?? {}).map((v) => v.toLowerCase())
    ).current
    const tokenSymbols = useRef(
        Object.keys(tokens ?? {}).map((key) => tokens[key].symbol.toLowerCase())
    ).current

    const {
        register,
        handleSubmit,
        setError,
        setValue,

        formState: { errors },
    } = useForm<customTokenFormData>({
        resolver: yupResolver(customTokenSchema),
    })

    const [isFirstIteration, setIsFirstIteration] = useState<boolean>(true)
    const [isFirstLoading, setIsFirstLoading] = useState<boolean>(true)
    const [isCustomTokenEmpty, setIsCustomTokenEmpty] = useState<boolean>(false)
    const [result, setResult] = useState<TokenResponse>({
        address: "",
        decimals: undefined,
        logo: "",
        name: "",
        symbol: "",
        type: "",
    })
    const [message, setMessage] = useState("")

    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        setResult((prevState) => ({
            ...prevState,
            address: customTokenAddress,
        }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setValue("tokenAddress", result.address)
        setValue("tokenDecimals", result.decimals?.toString() ?? "")
        setValue("tokenSymbol", result.symbol)
    }, [result.address, result.decimals, result.symbol, setValue])

    const onSubmit = handleSubmit(async (data: customTokenFormData) => {
        try {
            // Valid form data
            if (
                data.tokenAddress.length !== 42 ||
                data.tokenAddress.substring(0, 2) !== "0x"
            ) {
                return setMessage("Enter a valid address.")
            }

            if (
                !/^[a-zA-Z0-9_.$-]*$/.test(data.tokenSymbol) ||
                data.tokenSymbol === ""
            ) {
                return setMessage("Enter valid symbol.")
            }

            if (
                !data.tokenDecimals ||
                isNaN(parseInt(data.tokenDecimals)) ||
                data.tokenDecimals.length > 2
            ) {
                return setMessage("Enter valid decimals.")
            }

            const newToken = {
                address: data.tokenAddress,
                decimals: data.tokenDecimals,
                logo: "",
                name: data.tokenSymbol,
                symbol: data.tokenSymbol,
                type: "",
            }
            const tokenToAdd = result.symbol ? result : newToken

            // populate symbol logo for custom token
            searchTokenInAssetsList(tokenToAdd.symbol.toUpperCase()).then(
                (res) => {
                    const exactMatch = res.filter(
                        (r) =>
                            r.symbol.toLowerCase() ===
                            tokenToAdd.symbol.toLowerCase()
                    )[0]

                    tokenToAdd.logo = exactMatch ? exactMatch.logo : ""

                    history.push({
                        pathname: "/settings/tokens/add/confirm",
                        state: {
                            tokens: [tokenToAdd],
                            ...(history.location.state || {}),
                        },
                    })
                }
            )
        } catch (event) {
            // Invalid form data
            setError("tokenAddress", event.toString())
        }
    })

    const verifiyToken = (token: Token): string => {
        if (tokenAddresses.includes(token.address.toLowerCase())) {
            return "You already added this token"
        } else if (tokenSymbols.includes(token.symbol.toLowerCase())) {
            return "You already added a token with this symbol"
        } else {
            return ""
        }
    }

    const onAddressChange = (value: string) => {
        if (utils.isAddress(value)) {
            setError("tokenAddress", { message: undefined })
            setIsCustomTokenEmpty(false)
            setIsLoading(true)
            searchTokenInAssetsList(value)
                .then((res) => {
                    if (isFirstLoading) setIsFirstLoading(false)

                    setIsLoading(false)
                    if (res && res.length) {
                        const message = verifiyToken(res[0])

                        setMessage(message)

                        setResult((prevState) => ({
                            ...prevState,
                            ...res[0],
                        }))
                    }
                })
                .catch((err) => {
                    setIsLoading(false)
                    console.log("ERR: ", err)
                })
        } else {
            setError("tokenAddress", { message: "Invalid contract address" })
            setIsCustomTokenEmpty(true)
            setResult({
                address: value,
                decimals: undefined,
                logo: "",
                name: "",
                symbol: "",
                type: "",
            })
        }
    }

    const onSymbolChange = (value: string) => {
        if (tokenSymbols.includes(value.toLowerCase())) {
            setMessage("You already added a token with this symbol")
        } else {
            setMessage("")
        }

        updateResultField("symbol", value)
        updateResultField("name", value.toUpperCase())
    }

    const onDecimalsChange = (value: number) => {
        updateResultField("decimals", value)
        setMessage("")
    }

    const updateResultField = (field: string, value: string | number) => {
        setResult((prevState) => ({
            ...prevState,
            [field]: value,
        }))
    }

    if (isFirstIteration && customTokenAddress) {
        onAddressChange(customTokenAddress)
        setIsFirstIteration(false)
    }

    return (
        <>
            {/* Custom token form */}
            <form
                className="flex flex-col justify-between h-full"
                onSubmit={onSubmit}
            >
                <div className="text-base font-bold text-black w-full text-center px-6">
                    Custom Token
                </div>
                <div className="h-full">
                    {isLoading && isFirstLoading ? (
                        <div className="w-full h-full flex justify-center items-center">
                            <Spinner size="24px" />
                        </div>
                    ) : (
                        <>
                            {/* ADDRESS */}
                            <div className="flex flex-col flex-1 p-6 pb-0 space-y-1">
                                <TextInput
                                    appearance="outline"
                                    label="Token Contract Address"
                                    placeholder={result.address || "Address"}
                                    {...register("tokenAddress", {
                                        onChange: (e) => {
                                            onAddressChange(e.target.value)
                                        },
                                    })}
                                    error={errors.tokenAddress?.message}
                                    autoFocus={true}
                                    maxLength={42}
                                    defaultValue={result.address}
                                />
                            </div>

                            {/* SYMBOL */}
                            <div className="flex flex-col flex-1 p-6 pb-0 space-y-1">
                                <TextInput
                                    appearance="outline"
                                    label="Token Symbol"
                                    placeholder={result.symbol || "ETH"}
                                    defaultValue={result.symbol}
                                    error={errors.tokenSymbol?.message}
                                    {...register("tokenSymbol", {
                                        onChange: (e) => {
                                            onSymbolChange(e.target.value)
                                        },
                                    })}
                                />
                            </div>

                            {/* DECIMALS */}
                            <div className="flex flex-col flex-1 p-6 pb-0 space-y-1">
                                <TextInput
                                    appearance="outline"
                                    label="Decimals of Precision"
                                    placeholder={
                                        result.decimals
                                            ? result.decimals.toString()
                                            : "18"
                                    }
                                    defaultValue={result.decimals || ""}
                                    error={errors.tokenDecimals?.message}
                                    {...register("tokenDecimals", {
                                        onChange: (e) => {
                                            onDecimalsChange(e.target.value)
                                        },
                                    })}
                                />
                            </div>

                            {/* ERROR */}
                            <div
                                className={`text-xs px-6 text-red-500 ${
                                    message === "" ? "pt-0 h-0" : "pt-2"
                                }`}
                            >
                                {message || <>&nbsp;</>}
                            </div>
                        </>
                    )}
                </div>
                <hr className="border-0.5 border-gray-200 w-full" />
                {/* FOOTER */}
                <PopupFooter>
                    <ButtonWithLoading
                        type="submit"
                        label="Next"
                        isLoading={isLoading}
                        disabled={
                            isLoading || isCustomTokenEmpty || message !== ""
                        }
                    />
                </PopupFooter>
            </form>
        </>
    )
}

export default AddTokensPage
