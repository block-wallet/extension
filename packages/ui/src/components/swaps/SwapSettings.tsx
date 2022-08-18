import * as yup from "yup"
import CloseIcon from "../icons/CloseIcon"
import Dialog from "../dialog/Dialog"
import Divider from "../Divider"
import React, { FunctionComponent, useEffect, useRef, useState } from "react"
import ToggleButton from "../button/ToggleButton"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import { Classes, classnames } from "../../styles"
import { InferType } from "yup"
import { getNextNonce } from "../../context/commActions"
import { useForm } from "react-hook-form"
import { useOnClickOutside } from "../../util/useOnClickOutside"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { yupResolver } from "@hookform/resolvers/yup"
import OutlinedButton from "../ui/OutlinedButton"
import Icon, { IconName } from "../ui/Icon"

export interface SwapSettingsData {
    slippage: number
    customNonce?: number
    flashbots?: boolean
}

export const defaultSwapSettings: Required<SwapSettingsData> = {
    slippage: 0.5,
    customNonce: 0,
    flashbots: false,
}

interface SwapSettingsProps {
    address: string
    swapSettings: SwapSettingsData
    setSwapSettings: (x: SwapSettingsData) => void
}

const GetSwapSettingsSchema = () => {
    return yup.object({
        nonce: yup
            .string()
            .required("A nonce is required")
            .test("is-number", "Please enter a number", (value) => {
                if (typeof value != "string") return false
                return !isNaN(parseFloat(value))
            })
            .test("is-integer", "Nonce should be an integer", (value) => {
                if (typeof value != "string") return false
                return !value.includes(".")
            }),
        slippage: yup
            .string()
            .required("A slippage setting is required")
            .test("is-number", "Please enter a number", (value) => {
                if (typeof value != "string") return false
                return !isNaN(parseFloat(value))
            })
            .test("too-large", "Slippage can't be more than 100%", (value) => {
                if (typeof value != "string") return false
                return parseFloat(value) < 100
            }),
    })
}

type SwapSettingsFormData = InferType<ReturnType<typeof GetSwapSettingsSchema>>

export const SwapSettings: FunctionComponent<SwapSettingsProps> = ({
    address,
    swapSettings,
    setSwapSettings,
}) => {
    const { chainId } = useSelectedNetwork()
    const isFlashbotsAvailable = chainId === 1

    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isFlashbotsEnabled, setIsFlashbotsEnabled] = useState<boolean>(
        isFlashbotsAvailable ? !!swapSettings.flashbots : false
    )
    const [slippageWarning, setSlippageWarning] = useState<string | null>(null)

    const nextNonce = useRef<number>(defaultSwapSettings.customNonce)
    const clickOutsideRef = useRef<HTMLDivElement | null>(null)
    useOnClickOutside(clickOutsideRef, () => {
        setIsOpen(false)
    })

    // Validation
    const schema = GetSwapSettingsSchema()

    const {
        clearErrors,
        getValues,
        handleSubmit,
        register,
        setValue,
        formState: { errors },
    } = useForm<InferType<typeof schema>>({
        resolver: yupResolver(schema),
    })

    const canSubmit = !(errors.nonce || errors.slippage)
    const isModified = () => {
        const { nonce, slippage } = getValues()
        return (
            swapSettings.customNonce !== parseInt(nonce) ||
            swapSettings.slippage !== parseFloat(slippage) ||
            isFlashbotsEnabled !== swapSettings.flashbots
        )
    }

    const validateSlippage = (v: string) => {
        if (!v) {
            setSlippageWarning(null)
            return
        }

        const parsedSlippage = parseFloat(v)

        if (!isFlashbotsEnabled && parsedSlippage > 2) {
            setSlippageWarning("The swap may be frontrun")
            return
        }

        if (parsedSlippage < 0.05) {
            setSlippageWarning("The swap may fail")
            return
        }

        setSlippageWarning(null)
    }

    const onNonceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputLimit = 7
        let value = event.target.value

        value = value.slice(0, inputLimit)

        value = value.replace(/[^0-9]/g, "")

        if (value === "") {
            setValue("nonce", "", {
                shouldValidate: true,
            })
        } else {
            setValue("nonce", value, {
                shouldValidate: true,
            })
        }
    }

    const onSlippageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputLimit = 5
        let value = event.target.value

        value = value.slice(0, inputLimit)

        value = value
            .replace(/[^0-9.,]/g, "")
            .replace(",", ".")
            .replace(/(\..*?)\..*/g, "$1")

        if (value === ".") {
            value = ""
        }

        if (value === "") {
            setValue("slippage", "", {
                shouldValidate: true,
            })
        } else {
            setValue("slippage", value, {
                shouldValidate: true,
            })
        }

        validateSlippage(value)
    }

    // Reset swap settings to default
    const resetSettings = () => {
        clearErrors()

        setValue("nonce", nextNonce.current.toString(), {
            shouldValidate: true,
        })
        setValue("slippage", defaultSwapSettings.slippage.toString(), {
            shouldValidate: true,
        })

        validateSlippage(defaultSwapSettings.slippage.toString())

        setIsFlashbotsEnabled(
            isFlashbotsAvailable
                ? swapSettings.flashbots || defaultSwapSettings.flashbots
                : false
        )
    }

    const onSubmit = handleSubmit(
        ({ slippage, nonce }: SwapSettingsFormData) => {
            setSwapSettings({
                customNonce: parseInt(nonce),
                flashbots: isFlashbotsEnabled,
                slippage: parseFloat(slippage),
            })

            setIsOpen(false)
        }
    )

    useEffect(() => {
        const fetch = async () => {
            nextNonce.current = await getNextNonce(address)

            setValue("slippage", defaultSwapSettings.slippage.toString(), {
                shouldValidate: true,
            })
            setValue("nonce", nextNonce.current.toString(), {
                shouldValidate: true,
            })

            validateSlippage(defaultSwapSettings.slippage.toString())

            setSwapSettings({
                customNonce: nextNonce.current,
                flashbots: isFlashbotsEnabled,
                slippage: defaultSwapSettings.slippage,
            })
        }

        fetch()

        // eslint-disable-next-line
    }, [])

    useEffect(() => {
        if (isOpen) {
            clearErrors()

            setValue(
                "nonce",
                swapSettings.customNonce?.toString() ||
                    nextNonce.current.toString(),
                {
                    shouldValidate: true,
                }
            )
            setValue(
                "slippage",
                swapSettings.slippage.toString() ||
                    defaultSwapSettings.slippage.toString(),
                {
                    shouldValidate: true,
                }
            )

            validateSlippage(
                swapSettings.slippage.toString() ||
                    defaultSwapSettings.slippage.toString()
            )

            setIsFlashbotsEnabled(
                isFlashbotsAvailable
                    ? swapSettings.flashbots || defaultSwapSettings.flashbots
                    : false
            )
        }

        // eslint-disable-next-line
    }, [isOpen, nextNonce.current])

    return (
        <>
            <OutlinedButton
                onClick={() => setIsOpen(true)}
                className="w-full py-3"
            >
                <span className="font-bold text-sm">Settings</span>
                <Icon name={IconName.RIGHT_CHEVRON} size="sm" />
            </OutlinedButton>
            <Dialog open={isOpen}>
                <div className="absolute top-0 right-0 p-4 z-40">
                    <div
                        onClick={() => {
                            setIsOpen(false)
                        }}
                        className="cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
                    >
                        <CloseIcon size="10" />
                    </div>
                </div>
                <div
                    className="flex flex-col w-full space-y-2 p-2"
                    ref={clickOutsideRef}
                >
                    <span className="p-0 text-base font-bold">
                        Swap Settings
                    </span>

                    <div className="flex flex-col">
                        <p className="text-xs font-medium pb-1">
                            Slippage percentage (%)
                        </p>
                        <input
                            {...register("slippage")}
                            id="slippage"
                            name="slippage"
                            type="text"
                            autoComplete="off"
                            onChange={(e) => {
                                onSlippageChange(e)
                            }}
                            className={classnames(
                                Classes.inputBordered,
                                errors.slippage
                                    ? "border-red-400 focus:border-red-400"
                                    : slippageWarning &&
                                          "border-yellow-400 focus:border-yellow-600"
                            )}
                        />
                        {errors.slippage?.message ? (
                            <p className="text-xs text-red-500 pt-1">
                                {errors.slippage?.message}
                            </p>
                        ) : (
                            <p className="text-xs text-yellow-500 pt-1">
                                {slippageWarning} &nbsp;
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <p className="text-xs font-medium pb-1">Custom Nonce</p>
                        <input
                            {...register("nonce")}
                            id="nonce"
                            name="nonce"
                            type="text"
                            autoComplete="off"
                            onChange={(e) => {
                                onNonceChange(e)
                            }}
                            className={classnames(
                                Classes.inputBordered,
                                errors.nonce &&
                                    "border-red-400 focus:border-red-400"
                            )}
                        />
                        <p className="text-xs text-red-500 pt-1">
                            {errors.nonce?.message}&nbsp;
                        </p>
                    </div>

                    {isFlashbotsAvailable && (
                        <div className="flex flex-col space-y-1">
                            <span className="text-xs font-medium">
                                Flashbots
                            </span>
                            <ToggleButton
                                defaultChecked={swapSettings.flashbots ?? false}
                                inputName="flashbots"
                                onToggle={(checked) => {
                                    setIsFlashbotsEnabled(checked)
                                }}
                            />
                        </div>
                    )}

                    <p
                        onClick={() => resetSettings()}
                        className="text-xs text-blue-500 hover:text-blue-800 cursor-pointer w-min pb-1"
                    >
                        Reset
                    </p>

                    <div className="-mx-5 pb-2">
                        <Divider />
                    </div>

                    <ButtonWithLoading
                        type="submit"
                        label="Save"
                        disabled={!(canSubmit && isModified())}
                        buttonClass={Classes.button}
                        onClick={() => {
                            onSubmit()
                        }}
                    />
                </div>
            </Dialog>
        </>
    )
}
