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
        tokenSymbol: yup
            .string()
            .required("Please enter a token symbol")
            .matches(/^[a-zA-Z0-9_.$-]*$/, "Please enter a valid symbol."),
        tokenDecimals: yup
            .string()
            .required("Please enter token decimals")
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

    const onSubmit = handleSubmit(async (data: addManualTokenFormData) => {
        try {
            // Valid form data

            const tokenToAdd = {
                address: data.tokenAddress,
                decimals: data.tokenDecimals,
                logo: values.tokenLogo,
                name: values.tokenName ?? values.tokenSymbol.toUpperCase(),
                symbol: data.tokenSymbol,
                type: values.tokenType,
            }

            // populate symbol logo for manual token
            const res = await searchTokenInAssetsList(
                tokenToAdd.symbol.toUpperCase()
            )
            if (res) {
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
        } catch (event) {
            // Invalid form data
            setError("tokenAddress", event.toString())
        }
    })

    useEffect(() => {
        let msg = ""
        if (
            tokenAddresses.includes(values.tokenAddress.toLowerCase()) ||
            tokenSymbols.includes(values.tokenSymbol.toLowerCase())
        ) {
            msg = "You've already added this token"
        }

        setMessage(msg)
        if (setSubmitEnabled && msg !== "") {
            setSubmitEnabled(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values.tokenSymbol, values.tokenAddress, setMessage])

    const onAddressChange = async (value: string) => {
        if (!setSubmitEnabled) return

        setSubmitEnabled(false)
        if (utils.isAddress(value)) {
            setError("tokenAddress", { message: undefined })
            setIsLoading(true)
            const res = await searchTokenInAssetsList(value)
            setIsLoading(false)
            if (res) {
                if (res && res.length) {
                    setValue("tokenAddress", res[0].address)
                    setValue("tokenDecimals", res[0].decimals.toString())
                    setValue("tokenLogo", res[0].logo)
                    setValue("tokenName", res[0].name)
                    setValue("tokenSymbol", res[0].symbol)
                    setValue("tokenType", res[0].type)

                    setSubmitEnabled(true)
                }
            }
        } else {
            reset()
            setError("tokenAddress", { message: "Invalid contract address" })
            setValue("tokenAddress", value)
        }
    }

    useEffect(() => {
        onAddressChange(manualTokenAddress)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manualTokenAddress])

    return (
        <>
            {/* Add Manual token form */}
            <form
                id="manualViewForm"
                className="flex flex-col justify-between h-full mt-20"
                onSubmit={onSubmit}
            >
                <div className="text-base font-bold text-black w-full text-center px-6">
                    Custom Token
                </div>
                <div className="h-full">
                    {isLoading ? (
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
                                />
                            </div>

                            {/* SYMBOL */}
                            <div className="flex flex-col flex-1 p-6 pb-0 space-y-1">
                                <TextInput
                                    appearance="outline"
                                    label="Token Symbol"
                                    placeholder={values.tokenSymbol || "ETH"}
                                    defaultValue={values.tokenSymbol}
                                    error={errors.tokenSymbol?.message}
                                    {...register("tokenSymbol")}
                                />
                            </div>

                            {/* DECIMALS */}
                            <div className="flex flex-col flex-1 p-6 pb-0 space-y-1">
                                <TextInput
                                    appearance="outline"
                                    label="Decimals of Precision"
                                    placeholder={
                                        values.tokenDecimals
                                            ? values.tokenDecimals.toString()
                                            : "18"
                                    }
                                    defaultValue={values.tokenDecimals || ""}
                                    readOnly={values.tokenDecimals !== "0"}
                                    error={errors.tokenDecimals?.message}
                                    {...register("tokenDecimals")}
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

export default AddTokenManualView
