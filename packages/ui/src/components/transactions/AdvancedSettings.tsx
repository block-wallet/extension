import * as yup from "yup"
import CloseIcon from "../icons/CloseIcon"
import Dialog from "../dialog/Dialog"
import Divider from "../Divider"
import Icon, { IconName } from "../ui/Icon"
import OutlinedButton from "../ui/OutlinedButton"
import ToggleButton from "../button/ToggleButton"
import Tooltip from "../label/Tooltip"
import { AiFillInfoCircle } from "react-icons/ai"
import { BigNumber } from "@ethersproject/bignumber"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import { Classes, classnames } from "../../styles"
import { FunctionComponent, useEffect, useRef, useState } from "react"
import { InferType } from "yup"
import { TransactionAdvancedData } from "@block-wallet/background/controllers/transactions/utils/types"
import { getNextNonce } from "../../context/commActions"
import { useForm } from "react-hook-form"
import { useOnClickOutside } from "../../util/useOnClickOutside"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { yupResolver } from "@hookform/resolvers/yup"

export interface AdvancedSettingsDisplay {
    nonce: boolean
    flashbots: boolean
    slippage: boolean
}

export interface AdvancedSettingsProps {
    address: string
    advancedSettings: TransactionAdvancedData
    setAdvancedSettings: (x: TransactionAdvancedData) => void
    defaultSettings?: Required<TransactionAdvancedData>
    display?: AdvancedSettingsDisplay
    label?: string
    transactionGasLimit?: BigNumber
    buttonDisplay?: boolean
    transactionId?: string
}

export const defaultAdvancedSettings: Required<TransactionAdvancedData> = {
    customAllowance: "0",
    customNonce: 0,
    flashbots: false,
    slippage: 0.5,
}

export const defaultSettingsDisplay: AdvancedSettingsDisplay = {
    nonce: true,
    flashbots: true,
    slippage: false,
}

export const FLASHBOTS_MIN_GAS_LIMIT = BigNumber.from(42000)

const GetAdvancedSettingsSchema = (display: AdvancedSettingsDisplay) => {
    return yup.object({
        nonce: yup.string().when([], {
            is: () => display.nonce,
            then: yup
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
        }),
        slippage: yup.string().when([], {
            is: () => display.slippage,
            then: yup
                .string()
                .required("A slippage setting is required")
                .test("is-number", "Please enter a number", (value) => {
                    if (typeof value != "string") return false
                    return !isNaN(parseFloat(value))
                })
                .test(
                    "too-large",
                    "Slippage can't be more than 100%",
                    (value) => {
                        if (typeof value != "string") return false
                        return parseFloat(value) < 100
                    }
                ),
        }),
    })
}

type AdvancedSettingsFormData = InferType<
    ReturnType<typeof GetAdvancedSettingsSchema>
>

/**
 * Advanced Settings
 * Opens a Dialog where the user can customize advanced transaction settings.
 *
 * @param address Transaction signing address
 * @param advancedSettings Current parent advanced settings state
 * @param setAdvancedSettings Parent set state callback
 * @param defaultSettings Default advanced settings
 * @param display Custom display options
 * @param label Label for the button
 * @param transactionGasLimit Gas limit for the transaction in BigNumber
 * @param buttonDisplay Whether to display the button or just a clickable text to open the dialog
 * @param transactionId Transaction ID to refetch the nonce if ID changes
 */
export const AdvancedSettings: FunctionComponent<AdvancedSettingsProps> = ({
    address,
    advancedSettings,
    setAdvancedSettings,
    defaultSettings = defaultAdvancedSettings,
    display = defaultSettingsDisplay,
    label = "Advanced Settings",
    transactionGasLimit = BigNumber.from(21000),
    buttonDisplay = true,
    transactionId,
}) => {
    const { chainId } = useSelectedNetwork()
    const isFlashbotsAvailable = chainId === 1

    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isFlashbotsEnabled, setIsFlashbotsEnabled] = useState<boolean>(
        isFlashbotsAvailable ? !!advancedSettings.flashbots : false
    )
    const [slippageWarning, setSlippageWarning] = useState<string | null>(null)

    const nextNonce = useRef<number>(defaultSettings.customNonce)
    const clickOutsideRef = useRef<HTMLDivElement | null>(null)
    useOnClickOutside(clickOutsideRef, () => {
        setIsOpen(false)
    })

    // Validation
    const schema = GetAdvancedSettingsSchema(display)

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

        if (
            nonce &&
            display.nonce &&
            advancedSettings.customNonce !== parseInt(nonce)
        ) {
            return true
        }

        if (
            display.flashbots &&
            advancedSettings.flashbots !== isFlashbotsEnabled
        ) {
            return true
        }

        if (
            slippage !== undefined &&
            display.slippage &&
            advancedSettings.slippage !== parseFloat(slippage)
        ) {
            return true
        }
    }

    const validateSlippage = (v: string) => {
        if (!v) {
            setSlippageWarning(null)
            return
        }

        const parsedSlippage = parseFloat(v)

        if (!isFlashbotsEnabled && parsedSlippage > 3) {
            setSlippageWarning("The transaction may be frontrun")
            return
        }

        if (parsedSlippage < 0.05) {
            setSlippageWarning("The transaction may fail")
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

    // Reset settings to default
    const resetSettings = () => {
        clearErrors()

        setValue("nonce", nextNonce.current.toString(), {
            shouldValidate: true,
        })
        setValue("slippage", defaultSettings.slippage.toString(), {
            shouldValidate: true,
        })

        validateSlippage(defaultSettings.slippage.toString())

        setIsFlashbotsEnabled(
            isFlashbotsAvailable
                ? advancedSettings.flashbots || defaultSettings.flashbots
                : false
        )
    }

    const onSubmit = handleSubmit(
        ({ slippage, nonce }: AdvancedSettingsFormData) => {
            setAdvancedSettings({
                customNonce: nonce ? parseInt(nonce) : undefined,
                flashbots: isFlashbotsEnabled,
                slippage:
                    slippage !== undefined ? parseFloat(slippage) : undefined,
            })

            setIsOpen(false)
        }
    )

    useEffect(() => {
        const fetch = async () => {
            nextNonce.current = await getNextNonce(address)

            setValue("slippage", defaultSettings.slippage.toString(), {
                shouldValidate: true,
            })
            setValue("nonce", nextNonce.current.toString(), {
                shouldValidate: true,
            })

            validateSlippage(defaultSettings.slippage.toString())

            setAdvancedSettings({
                customNonce: nextNonce.current,
                flashbots: isFlashbotsEnabled,
                slippage:
                    advancedSettings.slippage !== undefined
                        ? advancedSettings.slippage
                        : defaultSettings.slippage,
            })
        }

        fetch()

        // eslint-disable-next-line
    }, [transactionId])

    useEffect(() => {
        if (isOpen) {
            clearErrors()

            setValue(
                "nonce",
                advancedSettings.customNonce?.toString() ||
                    nextNonce.current.toString(),
                {
                    shouldValidate: true,
                }
            )
            setValue(
                "slippage",
                (advancedSettings.slippage !== undefined
                    ? advancedSettings.slippage
                    : defaultSettings.slippage
                ).toString(),
                {
                    shouldValidate: true,
                }
            )

            validateSlippage(
                (advancedSettings.slippage !== undefined
                    ? advancedSettings.slippage
                    : defaultSettings.slippage
                ).toString()
            )

            setIsFlashbotsEnabled(
                isFlashbotsAvailable
                    ? advancedSettings.flashbots || defaultSettings.flashbots
                    : false
            )
        }

        // eslint-disable-next-line
    }, [isOpen, nextNonce.current])

    return (
        <>
            {buttonDisplay ? (
                <OutlinedButton
                    onClick={() => setIsOpen(true)}
                    className="!w-full py-3 h-12 space-x-2 p-4"
                >
                    <span className="font-semibold text-sm">{label}</span>
                    <Icon name={IconName.RIGHT_CHEVRON} size="sm" />
                </OutlinedButton>
            ) : (
                <div className="flex flex-col items-end">
                    <span
                        className="text-xs font-semibold text-primary-blue-default cursor-pointer hover:underline"
                        onClick={() => setIsOpen(true)}
                    >
                        {label}
                    </span>
                </div>
            )}

            <Dialog open={isOpen}>
                <div className="absolute top-0 right-0 p-5 z-40">
                    <div
                        onClick={() => {
                            setIsOpen(false)
                        }}
                        className="cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                    >
                        <CloseIcon size="10" />
                    </div>
                </div>
                <div
                    className="flex flex-col w-full px-3"
                    ref={clickOutsideRef}
                >
                    <p className="text-base font-semibold pb-3">{label}</p>

                    {display.slippage && (
                        <div className="w-full pb-3">
                            <p className="text-[13px] font-medium text-primary-grey-dark">
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
                                    "w-full mt-2",
                                    Classes.inputBordered,
                                    errors.slippage
                                        ? "border-red-400 focus:border-red-400"
                                        : slippageWarning &&
                                              "border-yellow-400 focus:border-yellow-600"
                                )}
                            />
                            {errors.slippage?.message || slippageWarning ? (
                                <p className="text-xs text-red-500 pt-1">
                                    {errors.slippage?.message ||
                                        slippageWarning}
                                </p>
                            ) : null}
                        </div>
                    )}

                    {display.nonce && (
                        <div className="w-full pb-2">
                            <p className="text-[13px] font-medium text-primary-grey-dark">
                                Custom Nonce
                            </p>
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
                                    "w-full mt-2",
                                    Classes.inputBordered,
                                    errors.nonce &&
                                        "border-red-400 focus:border-red-400"
                                )}
                            />
                            {errors.nonce?.message ? (
                                <p className="text-xs text-red-500 pt-1">
                                    {errors.nonce.message}
                                </p>
                            ) : null}
                        </div>
                    )}

                    {display.flashbots && isFlashbotsAvailable && (
                        <div className="w-full pb-2">
                            <div className="flex items-center pb-1">
                                <p className="text-xs font-medium ">
                                    Flashbots
                                </p>
                                <div className="group relative">
                                    <AiFillInfoCircle
                                        size={20}
                                        className="pl-1 text-primary-grey-dark  hover:text-primary-blue-default"
                                    />
                                    <Tooltip
                                        content={
                                            <div className="p-0.5 font-normal text-center text-xs text-white-500">
                                                <p>
                                                    Transactions consuming less
                                                    than 42,000 gas
                                                </p>
                                                <p>
                                                    will be mined normally,
                                                    without Flashbots.
                                                </p>
                                            </div>
                                        }
                                    />
                                </div>
                            </div>
                            <ToggleButton
                                defaultChecked={
                                    advancedSettings.flashbots ?? false
                                }
                                disabled={transactionGasLimit.lt(
                                    FLASHBOTS_MIN_GAS_LIMIT
                                )}
                                inputName="flashbots"
                                onToggle={(checked) => {
                                    setIsFlashbotsEnabled(checked)
                                }}
                            />
                        </div>
                    )}

                    <p
                        onClick={() => resetSettings()}
                        className="text-xs text-primary-blue-default hover:text-primary-blue-hover cursor-pointer w-min"
                    >
                        Reset
                    </p>

                    <div className="-mx-5 py-2">
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
