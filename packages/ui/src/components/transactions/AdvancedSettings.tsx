import * as yup from "yup"
import CloseIcon from "../icons/CloseIcon"
import Dialog from "../dialog/Dialog"
import Icon, { IconName } from "../ui/Icon"
import ToggleButton from "../button/ToggleButton"
import Tooltip from "../label/Tooltip"
import { AiFillInfoCircle } from "react-icons/ai"
import { BigNumber } from "@ethersproject/bignumber"
import { classnames } from "../../styles"
import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react"
import { InferType } from "yup"
import { TransactionAdvancedData } from "@block-wallet/background/controllers/transactions/utils/types"
import { getNextNonce } from "../../context/commActions"
import { useForm } from "react-hook-form"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { yupResolver } from "@hookform/resolvers/yup"
import OutlinedButton from "../ui/OutlinedButton"

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
    buttonClassName?: string
}

export const defaultAdvancedSettings: Required<TransactionAdvancedData> = {
    customAllowance: "0",
    customNonce: 0,
    flashbots: false,
    slippage: 1.0,
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
    buttonClassName = "",
}) => {
    const { chainId } = useSelectedNetwork()
    const isFlashbotsAvailable = chainId === 1

    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isFlashbotsEnabled, setIsFlashbotsEnabled] = useState<boolean>(
        isFlashbotsAvailable ? !!advancedSettings.flashbots : false
    )
    const [slippageWarning, setSlippageWarning] = useState<string | null>(null)

    const nextNonce = useRef<number>(defaultSettings.customNonce)

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

    const validateSlippage = useCallback((v: string) => {
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
    }, [isFlashbotsEnabled])

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

    }, [
        transactionId,
        address,
        advancedSettings.slippage,
        defaultSettings.slippage,
        isFlashbotsEnabled,
        setAdvancedSettings,
        setValue,
        validateSlippage
    ])

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

    }, [
        isOpen,
        advancedSettings.customNonce,
        advancedSettings.flashbots,
        advancedSettings.slippage,
        clearErrors,
        defaultSettings.flashbots,
        defaultSettings.slippage,
        isFlashbotsAvailable,
        setValue,
        validateSlippage
    ])

    return (
        <>
            {buttonDisplay ? (
                <OutlinedButton
                    onClick={() => setIsOpen(true)}
                    className={classnames("!w-full space-x-2 p-4", buttonClassName)}
                >
                    <span className="font-semibold text-sm">{label}</span>
                    <Icon name={IconName.RIGHT_CHEVRON} size="sm" />
                </OutlinedButton>
            ) : (
                <div className="flex flex-col items-end">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors duration-200"
                    >
                        {label}
                    </button>
                </div>
            )}

            <Dialog open={isOpen} className="max-h-[560px]">
                <div className="relative flex flex-col h-full">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-0 right-2 z-10 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label="Close advanced settings"
                    >
                        <CloseIcon size="16" />
                    </button>
                    <div className="text-center px-6 pt-1 pb-2 shrink-0">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                            {label}
                        </h2>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Customize transaction parameters for optimal execution
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 space-y-4">
                        {display.slippage && (
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Slippage Tolerance
                                    </label>
                                    <div className="group relative">
                                        <AiFillInfoCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" />
                                        <Tooltip
                                            placement="top"
                                            align="center"
                                            autoFlip
                                            content={
                                                <div className="text-xs text-center">
                                                    <p>Maximum price movement you're willing to accept.</p>
                                                    <p>Higher values reduce failure risk but increase cost.</p>
                                                </div>
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        {...register("slippage")}
                                        id="slippage"
                                        name="slippage"
                                        type="text"
                                        autoComplete="off"
                                        onChange={onSlippageChange}
                                        className={classnames(
                                            "w-full px-4 py-3 text-sm rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400",
                                            "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                                            errors.slippage
                                                ? "border-red-300 dark:border-red-600 focus:ring-red-500/20"
                                                : slippageWarning
                                                    ? "border-amber-300 dark:border-amber-600 focus:ring-amber-500/20"
                                                    : "border-gray-300 dark:border-gray-600"
                                        )}
                                        placeholder="0.5"
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                                    </div>
                                </div>
                                {(errors.slippage?.message || slippageWarning) && (
                                    <div className={classnames(
                                        "flex items-center space-x-2 text-xs",
                                        errors.slippage?.message
                                            ? "text-red-600 dark:text-red-400"
                                            : "text-amber-600 dark:text-amber-400"
                                    )}>
                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <span>{errors.slippage?.message || slippageWarning}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Nonce setting */}
                        {display.nonce && (
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Custom Nonce
                                    </label>
                                    <div className="group relative">
                                        <AiFillInfoCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" />
                                        <Tooltip
                                            placement="top"
                                            align="center"
                                            autoFlip
                                            content={
                                                <div className="text-xs text-center">
                                                    <p>Transaction sequence number.</p>
                                                    <p>Use higher values to replace pending transactions.</p>
                                                </div>
                                            }
                                        />
                                    </div>
                                </div>
                                <input
                                    {...register("nonce")}
                                    id="nonce"
                                    name="nonce"
                                    type="text"
                                    autoComplete="off"
                                    onChange={onNonceChange}
                                    className={classnames(
                                        "w-full px-4 py-3 text-sm rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400",
                                        "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                                        errors.nonce
                                            ? "border-red-300 dark:border-red-600 focus:ring-red-500/20"
                                            : "border-gray-300 dark:border-gray-600"
                                    )}
                                    placeholder="0"
                                />
                                {errors.nonce?.message && (
                                    <div className="flex items-center space-x-2 text-xs text-red-600 dark:text-red-400">
                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <span>{errors.nonce.message}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Flashbots setting */}
                        {display.flashbots && isFlashbotsAvailable && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Flashbots Protection
                                        </label>
                                        <div className="group relative">
                                            <AiFillInfoCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" />
                                            <Tooltip
                                                placement="top"
                                                align="center"
                                                autoFlip
                                                content={
                                                    <div className="text-xs text-center">
                                                        <p>Protects against MEV attacks by sending</p>
                                                        <p>transactions through Flashbots relay.</p>
                                                        <p className="mt-1 text-amber-200">Requires 42,000+ gas</p>
                                                    </div>
                                                }
                                            />
                                        </div>
                                    </div>
                                    <ToggleButton
                                        defaultChecked={advancedSettings.flashbots ?? false}
                                        disabled={transactionGasLimit.lt(FLASHBOTS_MIN_GAS_LIMIT)}
                                        inputName="flashbots"
                                        onToggle={(checked) => {
                                            setIsFlashbotsEnabled(checked)
                                        }}
                                    />
                                </div>
                                {transactionGasLimit.lt(FLASHBOTS_MIN_GAS_LIMIT) && (
                                    <div className="flex items-center space-x-2 text-xs text-amber-600 dark:text-amber-400">
                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Flashbots disabled: transaction gas below 42,000 limit</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reset button */}
                        <div className="flex justify-center pt-1">
                            <button
                                onClick={resetSettings}
                                className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline transition-colors duration-200"
                            >
                                Reset to Default
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-3 pt-6">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onSubmit}
                                disabled={!(canSubmit && isModified())}
                                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 dark:from-purple-500 dark:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-700 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            </Dialog>
        </>
    )
}
