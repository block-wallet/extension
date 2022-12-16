import { useEffect, useRef, useState } from "react"

// Context
import { useOnMountHistory } from "../../context/hooks/useOnMount"

// Components
import Spinner from "../spinner/Spinner"
import TextInput from "../input/TextInput"

import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { InferType } from "yup"

// Comm
import { searchTokenInAssetsList } from "../../context/commActions"

// Assets
import { utils } from "ethers/lib/ethers"
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
            // Invalid form data
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values.tokenSymbol, values.tokenAddress, setMessage])

    const onAddressChange = async (value: string) => {
        fetchTokenData(value)
    }

    const fetchTokenData = async (tokenAddress: string) => {
        if (!setSubmitEnabled) return
        if (!utils.isAddress(tokenAddress)) return

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

        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {/* Add Manual token form */}
            <form
                id="manualViewForm"
                className="flex flex-col justify-between h-4/5 mt-20"
                onSubmit={onSubmit}
            >
                <div className="flex justify-center items-center space-x-2 pb-3">
                    <div className="text-base font-bold text-black text-center">
                        Custom Token
                    </div>

                    <MdRefresh
                        size={18}
                        className={classNames(
                            "hover:cursor-pointer transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300",
                            refetchAnimation &&
                                "bg-primary-100 text-primary-300 animate-[bounce_1.5s]",
                            (!refetchOption || isLoading) && "invisible"
                        )}
                        onClick={() => {
                            fetchTokenData(values.tokenAddress)
                        }}
                        title="Refetch token data"
                    />
                </div>
                <div className="h-full">
                    {isLoading ? (
                        <div className="w-full h-4/5 flex justify-center items-center">
                            <Spinner size="24px" />
                        </div>
                    ) : (
                        <>
                            {/* ADDRESS */}
                            <div className="flex flex-col flex-1 p-6 pt-0 pb-3 space-y-1">
                                <TextInput
                                    appearance="outline"
                                    label="Token Contract Address"
                                    placeholder={
                                        values.tokenAddress || "Address"
                                    }
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

                            {/* NAME */}
                            <div className="flex flex-col flex-1 p-6 pt-0 pb-3 space-y-1">
                                <TextInput
                                    appearance="outline"
                                    label="Token Name"
                                    placeholder={values.tokenName || "Ether"}
                                    defaultValue={values.tokenName}
                                    error={errors.tokenName?.message}
                                    {...register("tokenName")}
                                />
                            </div>

                            {/* SYMBOL */}
                            <div className="flex flex-col flex-1 p-6 pt-0 pb-3 space-y-1">
                                <TextInput
                                    appearance="outline"
                                    label="Token Symbol"
                                    placeholder={values.tokenSymbol || "ETH"}
                                    defaultValue={values.tokenSymbol}
                                    error={errors.tokenSymbol?.message}
                                    {...register("tokenSymbol")}
                                    disabled={true}
                                />
                            </div>

                            {/* DECIMALS */}
                            <div className="flex flex-col flex-1 p-6 pt-0 pb-3 space-y-1">
                                <TextInput
                                    appearance="outline"
                                    label="Decimals of Precision"
                                    placeholder={
                                        values.tokenDecimals
                                            ? values.tokenDecimals.toString()
                                            : ""
                                    }
                                    defaultValue={values.tokenDecimals || ""}
                                    error={errors.tokenDecimals?.message}
                                    {...register("tokenDecimals")}
                                    disabled={true}
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
            <WarningDialog
                useClickOutside={true}
                title="Duplicated symbol"
                message="We detected a duplicate symbol that already exists in your account. You may be exposed to potential scams by adding this token. Would you still like to proceed?"
                open={shouldShowWarningDialog}
                onDone={() => setShouldShowWarningDialog(false)}
                buttonLabel="Yes, I understand the risk"
            />
        </>
    )
}

export default AddTokenManualView
