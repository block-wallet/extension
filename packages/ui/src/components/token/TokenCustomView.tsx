import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"

// Types
import { Token } from "@block-wallet/background/controllers/erc-20/Token"

// Context
import { useBlankState } from "../../context/background/backgroundHooks"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"

// Components
import Spinner from "../../components/spinner/Spinner"
import TextInput from "../../components/input/TextInput"

import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { InferType } from "yup"

// Comm
import { searchTokenInAssetsList } from "../../context/commActions"

// Assets
import { utils } from "ethers/lib/ethers"
import { TokenResponse } from "../../routes/settings/AddTokensPage"
import useAsyncInvoke from "../../util/hooks/useAsyncInvoke"

export interface tokenCustomViewProps {
    customTokenAddress?: string
    submitForm?: boolean
    setSubmitEnabled?: (value: any) => Promise<any> | void
}

const CustomTokenView = ({
    customTokenAddress = "",
    submitForm = false,
    setSubmitEnabled = undefined,
}: tokenCustomViewProps) => {
    const { run } = useAsyncInvoke()

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

    const history = useOnMountHistory()

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
    // const [isCustomTokenEmpty, setIsCustomTokenEmpty] = useState<boolean>(false)
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
            if (setSubmitEnabled) {
                setSubmitEnabled(true)
            }
            return ""
        }
    }

    const onAddressChange = (value: string) => {
        if (utils.isAddress(value)) {
            setError("tokenAddress", { message: undefined })
            // setIsCustomTokenEmpty(false)
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
            // setIsCustomTokenEmpty(true)
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

    useEffect(() => {
        if (submitForm) {
            run(onSubmit())
        }
    }, [submitForm])

    return (
        <>
            {/* Custom token form */}
            <form
                id="customTokenForm"
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
                                    readOnly={!!result.decimals}
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
            </form>
        </>
    )
}

export default CustomTokenView
