import { useEffect, useRef, useState } from "react"

import { useOnMountHistory } from "../../context/hooks/useOnMount"

import Spinner from "../spinner/Spinner"
import TextInput from "../input/TextInput"

import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { InferType } from "yup"

import { searchTokenInAssetsList } from "../../context/commActions"

import { isValidAddress } from "ethereumjs-util"
import { useForm } from "react-hook-form"
import { useAccountTokens } from "../../context/hooks/useAccountTokens"
import { MdRefresh } from "react-icons/md"
import classNames from "classnames"
import WarningDialog from "../dialog/WarningDialog"

export interface addTokenManualViewProps {
    manualTokenAddress?: string
    setSubmitEnabled?: (value: any) => Promise<any>
}

const AddTokenManualView = ({
    manualTokenAddress = "",
    setSubmitEnabled = undefined,
}: addTokenManualViewProps) => {
    const addManualTokenSchema = yup.object({
        tokenAddress: yup
            .string()
            .required("Please enter a contract address")
            .test("invalid-contract", "Token contract is not valid", (s) => {
                return !(!s || s.length !== 42 || s.substring(0, 2) !== "0x")
            }),
        tokenSymbol: yup.string().required("Please enter a token symbol"),
        tokenDecimals: yup
            .string()
            .required("Could not fetch token decimals. Please refresh.")
            .test("not-valid-decimals", "Please enter valid decimals", (s) => {
                return !(!s || isNaN(parseInt(s)) || s.length > 2)
            }),
        tokenLogo: yup.string(),
        tokenName: yup.string(),
        tokenType: yup.string(),
    })
    type addManualTokenFormData = InferType<typeof addManualTokenSchema>

    const {
        register,
        handleSubmit,
        setError,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<addManualTokenFormData>({
        defaultValues: {
            tokenAddress: "",
            tokenDecimals: undefined,
            tokenLogo: "",
            tokenName: "",
            tokenSymbol: "",
            tokenType: "",
        },
        resolver: yupResolver(addManualTokenSchema),
    })

    const values = watch()
    const history = useOnMountHistory()
    const tokens = useAccountTokens()

    const tokenAddresses = useRef(
        Object.keys(tokens ?? {}).map((v) => v.toLowerCase())
    ).current
    const tokenSymbols = useRef(
        Object.keys(tokens ?? {}).map((key) => tokens[key].symbol.toLowerCase())
    ).current
    const [message, setMessage] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const [refetchOption, setRefetchOption] = useState(false)
    const [refetchAnimation, setRefetchAnimation] = useState(false)
    const [shouldShowWarningDialog, setShouldShowWarningDialog] =
        useState(false)

    const onSubmit = handleSubmit(async (data: addManualTokenFormData) => {
        try {
            const tokenToAdd = {
                address: data.tokenAddress,
                decimals: data.tokenDecimals,
                logo: values.tokenLogo,
                name: data.tokenName ?? data.tokenSymbol.toUpperCase(),
                symbol: data.tokenSymbol,
                type: values.tokenType,
            }
            history.push({
                pathname: "/settings/tokens/add/confirm",
                state: {
                    tokens: [tokenToAdd],
                    ...(history.location.state || {}),
                },
            })
        } catch (event) {
            setError("tokenAddress", event.toString())
        }
    })

    useEffect(() => {
        let msg = ""
        if (tokenAddresses.includes(values.tokenAddress.toLowerCase())) {
            msg = "You've already added this token"
        } else if (tokenSymbols.includes(values.tokenSymbol.toLowerCase())) {
            setShouldShowWarningDialog(true)
        }

        setMessage(msg)
        if (setSubmitEnabled && (msg !== "" || shouldShowWarningDialog)) {
            setSubmitEnabled(false)
        }
    }, [values.tokenSymbol, values.tokenAddress, setMessage])

    const onAddressChange = async (value: string) => {
        fetchTokenData(value)
    }

    const fetchTokenData = async (tokenAddress: string) => {
        if (!setSubmitEnabled) return
        if (!isValidAddress(tokenAddress)) return

        setSubmitEnabled(false)
        setRefetchOption(false)
        setError("tokenAddress", { message: undefined })
        setIsLoading(true)

        const tokenSearchResponse = await searchTokenInAssetsList(tokenAddress)

        setIsLoading(false)

        if (
            !tokenSearchResponse ||
            !tokenSearchResponse.tokens ||
            tokenSearchResponse.tokens.length === 0 ||
            (!tokenSearchResponse.tokens[0].name &&
                !tokenSearchResponse.tokens[0].symbol)
        ) {
            reset()
            setError("tokenAddress", {
                message: "Invalid contract address for this network.",
            })
            setValue("tokenAddress", tokenAddress)
            return
        }

        const token = tokenSearchResponse.tokens[0]

        if (tokenSearchResponse.fetchFailed) {
            reset()
            setError("tokenAddress", {
                message: "Could not fetch token data. Please try again.",
            })
            setValue("tokenAddress", tokenAddress)
            setRefetchOption(true)
            setTimeout(() => {
                setRefetchAnimation(true)
            }, 500)

            return
        }

        setValue("tokenAddress", token.address)
        setValue("tokenDecimals", token.decimals.toString())
        setValue("tokenLogo", token.logo)
        setValue("tokenName", token.name)
        setValue("tokenSymbol", token.symbol)
        setValue("tokenType", token.type)

        setSubmitEnabled(true)
    }

    useEffect(() => {
        onAddressChange(manualTokenAddress)

    }, [manualTokenAddress])

    useEffect(() => {
        if (refetchAnimation) {
            setTimeout(() => {
                setRefetchAnimation(false)
            }, 1500)
        }
    }, [refetchAnimation])

    return (
        <>
            <form
                id="manualViewForm"
                className="flex flex-col justify-between h-full p-6 space-y-6"
                onSubmit={onSubmit}
            >
                <div className="text-center space-y-4 mb-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center justify-center space-x-2">
                            <span>Custom Token</span>
                            {refetchOption && !isLoading && (
                                <button
                                    type="button"
                                    onClick={() => fetchTokenData(values.tokenAddress)}
                                    className={classNames(
                                        "p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200",
                                        refetchAnimation && "animate-spin"
                                    )}
                                    title="Refetch token data"
                                >
                                    <MdRefresh size={16} />
                                </button>
                            )}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Token details will be automatically fetched from the contract
                        </p>
                    </div>
                </div>

                <div className="flex-1 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-4">
                            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <Spinner size="24px" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                                    Fetching Token Data
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    Reading contract information...
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <TextInput
                                        appearance="outline"
                                        label="Token Contract Address *"
                                        placeholder="0x..."
                                        {...register("tokenAddress", {
                                            onChange: (e) => {
                                                onAddressChange(e.target.value)
                                            },
                                        })}
                                        error={errors.tokenAddress?.message}
                                        autoFocus={true}
                                        maxLength={42}
                                        defaultValue={values.tokenAddress}
                                        spellCheck={false}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <TextInput
                                        appearance="outline"
                                        label="Token Name"
                                        placeholder="e.g., Ethereum"
                                        defaultValue={values.tokenName}
                                        error={errors.tokenName?.message}
                                        {...register("tokenName")}
                                        disabled={!!values.tokenName}
                                    />
                                    {values.tokenName && (
                                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center space-x-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            <span>Auto-filled from contract</span>
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <TextInput
                                        appearance="outline"
                                        label="Token Symbol *"
                                        placeholder="e.g., ETH"
                                        defaultValue={values.tokenSymbol}
                                        error={errors.tokenSymbol?.message}
                                        {...register("tokenSymbol")}
                                        disabled={true}
                                    />
                                    {values.tokenSymbol && (
                                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center space-x-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            <span>Auto-filled from contract</span>
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <TextInput
                                        appearance="outline"
                                        label="Decimals of Precision *"
                                        placeholder="18"
                                        defaultValue={values.tokenDecimals || ""}
                                        error={errors.tokenDecimals?.message}
                                        {...register("tokenDecimals")}
                                        disabled={true}
                                    />
                                    {values.tokenDecimals && (
                                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center space-x-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            <span>Auto-filled from contract</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {message && (
                                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                                    <div className="flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                            {message}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                                <div className="flex space-x-3">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="text-sm text-blue-800 dark:text-blue-200">
                                        <p className="font-medium mb-1">Adding Custom Tokens</p>
                                        <ul className="space-y-1 text-xs">
                                            <li>• Enter a valid ERC-20 contract address</li>
                                            <li>• Token details will be fetched automatically</li>
                                            <li>• Only add tokens you trust to avoid scams</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </form>

            <WarningDialog
                useClickOutside={true}
                title="⚠️ Duplicate Token Symbol"
                message="A token with this symbol already exists in your wallet. Adding tokens with duplicate symbols may be a sign of scam tokens. Please verify this is the correct token before proceeding."
                open={shouldShowWarningDialog}
                onDone={() => setShouldShowWarningDialog(false)}
                buttonLabel="I understand the risks"
            />
        </>
    )
}

export default AddTokenManualView
