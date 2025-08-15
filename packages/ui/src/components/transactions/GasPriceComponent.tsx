import { FunctionComponent, useRef, useState, useEffect, useMemo, memo } from "react"
import classnames from "classnames"
import { BigNumber } from "@ethersproject/bignumber"

import { formatUnits, parseUnits } from "@ethersproject/units"
import * as yup from "yup"
import { InferType } from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import { GasPriceLevels } from "@block-wallet/background/controllers/GasPricesController"
import { TransactionFeeData } from "@block-wallet/background/controllers/erc-20/transactions/SignedTransaction"

import HorizontalSelect from "../input/HorizontalSelect"
import Tooltip from "../../components/label/Tooltip"
import { AiFillInfoCircle } from "react-icons/ai"
import { ImCheckmark } from "react-icons/im"
import Spinner from "../spinner/Spinner"
import Dialog from "../dialog/Dialog"
import EndLabel from "../input/EndLabel"
import { ButtonWithLoading as Button } from "../button/ButtonWithLoading"

import { capitalize } from "../../util/capitalize"
import {
    handleKeyDown,
    handleChangeAmountGwei,
    handleChangeAmountWei,
    makeStringNumberFormField,
} from "../../util/form"
import { useOnClickOutside } from "../../util/useOnClickOutside"
import { formatRounded } from "../../util/formatRounded"

import { ArrowUpDown } from "../icons/ArrowUpDown"
import CloseIcon from "../icons/CloseIcon"

import { useBlankState } from "../../context/background/backgroundHooks"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import WarningDialog from "../dialog/WarningDialog"
import { calculateGasPricesFromTransactionFees } from "../../util/gasPrice"
import { updateGasPrices } from "../../context/commActions"

import { GAS_PRICE_UPDATE_INTERVAL } from "../../util/constants"

interface GasComponentProps {
    symbol: string
    nativeCurrencyIcon: string
    gasFees: TransactionFeeData
    selectedOption: GasPriceOption
    options: GasPriceOption[]
    minGasLimit?: string
    setSelectedGas: (option: GasPriceOption) => void
    getGasOption: (label: string, gasFees: TransactionFeeData) => GasPriceOption
}

interface GasPriceOption {
    label: string
    gasFees: TransactionFeeData
    totalETHCostRange: string
    totalNativeCurrencyCostRange: string
    totalETHCost: string
    totalNativeCurrencyCost: string
}

type TransactionSpeed = {
    [key: string]: TransactionFeeData
}

const getTransactionSpeeds = (gasPrices: GasPriceLevels): TransactionSpeed => {
    return {
        low: {
            maxPriorityFeePerGas: BigNumber.from(
                gasPrices.slow.maxPriorityFeePerGas
            ),
            maxFeePerGas: BigNumber.from(gasPrices.slow.maxFeePerGas),
        },
        medium: {
            maxPriorityFeePerGas: BigNumber.from(
                gasPrices.average.maxPriorityFeePerGas
            ),
            maxFeePerGas: BigNumber.from(gasPrices.average.maxFeePerGas),
        },
        high: {
            maxPriorityFeePerGas: BigNumber.from(
                gasPrices.fast.maxPriorityFeePerGas
            ),
            maxFeePerGas: BigNumber.from(gasPrices.fast.maxFeePerGas),
        },
    }
}

const FormField = ({
    children,
    label,
    tooltip,
    error,
    warning
}: {
    children: React.ReactNode
    label: string
    tooltip?: string
    error?: string
    warning?: string
}) => (
    <div className="space-y-2">
        <label className="flex items-center text-sm font-medium text-gray-900 dark:text-gray-100">
            {label}
            {tooltip && (
                <span className="ml-1 group relative">
                    <AiFillInfoCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <Tooltip content={tooltip} placement="top" align="center" autoFlip />
                </span>
            )}
        </label>
        {children}
        {error && (
            <div className="flex items-start space-x-2 text-red-600 dark:text-red-400 text-xs">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
            </div>
        )}
        {warning && !error && (
            <div className="flex items-start space-x-2 text-amber-600 dark:text-amber-400 text-xs">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{warning}</span>
            </div>
        )}
    </div>
)

const GasSelectorBasic = (props: GasComponentProps) => {
    const { selectedOption, options, setSelectedGas } = props

    return (
        <div className="flex flex-col w-full space-y-1">
            {options.map((option, i) => (
                <div
                    key={option.label}
                    className="w-full flex flex-row items-center p-3 cursor-pointer rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                    onClick={() => {
                        setSelectedGas(option)
                    }}
                >
                    <div className="flex flex-col flex-grow space-y-2">
                        <div className="flex items-center justify-between">
                            <label
                                className={classnames(
                                    "text-base font-semibold cursor-pointer capitalize",
                                    selectedOption.label === option.label
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-gray-900 dark:text-gray-100"
                                )}
                            >
                                {option.label}
                            </label>
                            <ImCheckmark
                                className={classnames(
                                    "w-4 h-4",
                                    selectedOption.label === option.label
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "invisible"
                                )}
                            />
                        </div>
                        <div className="flex flex-col space-y-1">
                            <span
                                className={classnames(
                                    "text-sm font-medium",
                                    selectedOption.label === option.label
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-gray-700 dark:text-gray-300"
                                )}
                            >
                                {option.totalNativeCurrencyCostRange}
                            </span>
                            <span
                                className={classnames(
                                    "text-xs",
                                    selectedOption.label === option.label
                                        ? "text-blue-500 dark:text-blue-300"
                                        : "text-gray-500 dark:text-gray-400"
                                )}
                            >
                                {option.totalETHCostRange}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

const schemaBuilder = ({ minGasLimit }: { minGasLimit?: string } = {}) =>
    yup.object({
        gasLimit: makeStringNumberFormField("Gas limit is required", false, {
            min: [
                parseInt(minGasLimit ?? "0"),
                `Gas limit can't be lower than ${parseInt(minGasLimit ?? "0")}`,
            ],
        }),
        maxPriorityFeePerGas: makeStringNumberFormField(
            "Max tip is required",
            true
        ),
        maxFeePerGas: makeStringNumberFormField("Max fee is required", false),
    })
type GasAdvancedForm = InferType<ReturnType<typeof schemaBuilder>>

const GasSelectorAdvanced = (props: GasComponentProps) => {
    const { gasFees, selectedOption, getGasOption, setSelectedGas } = props
    const { estimatedBaseFee: baseFeePerGas, gasPricesLevels } =
        useGasPriceData()
    const { gasLowerCap } = useSelectedNetwork()

    const defaultFees: TransactionFeeData = {
        gasLimit: gasFees.gasLimit,
        maxPriorityFeePerGas:
            gasFees.maxPriorityFeePerGas ??
            BigNumber.from(gasPricesLevels.average.maxPriorityFeePerGas),
        maxFeePerGas:
            gasFees.maxFeePerGas ??
            BigNumber.from(gasPricesLevels.average.maxFeePerGas),
    }
    const [isCustom, setIsCustom] = useState<boolean>(
        selectedOption.label === "Custom"
    )
    const averageTip = BigNumber.from(
        gasPricesLevels.average.maxPriorityFeePerGas
    )

    const schema = useMemo(() => {
        return schemaBuilder({ minGasLimit: props.minGasLimit })
    }, [props.minGasLimit])

    const [gasLimitWarning, setGasLimitWarning] = useState("")
    const [tipWarning, setTipWarning] = useState("")
    const [maxFeeWarning, setMaxFeeWarning] = useState("")
    const [showGasLimitInput, setShowGasLimitInput] = useState(false)
    const [userRequestedGasLimit, setUserRequestedGasLimit] = useState(false)
    const [userExplicitlyHid, setUserExplicitlyHid] = useState(false)
    const justClickedRef = useRef(false)

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<GasAdvancedForm>({
        defaultValues: {
            gasLimit: formatUnits(
                isCustom
                    ? selectedOption.gasFees.gasLimit!
                    : defaultFees.gasLimit!,
                "wei"
            ),
            maxPriorityFeePerGas: formatUnits(
                isCustom
                    ? selectedOption.gasFees.maxPriorityFeePerGas!
                    : defaultFees.maxPriorityFeePerGas!,
                "gwei"
            ),
            maxFeePerGas: formatUnits(
                isCustom
                    ? selectedOption.gasFees.maxFeePerGas!
                    : defaultFees.maxFeePerGas!,
                "gwei"
            ),
        },
        resolver: yupResolver(schema),
    })

    const handleCustomChange = () => {
        setIsCustom(true)
        setValue("gasLimit", formatUnits(defaultFees.gasLimit!, "wei"))
        setValue(
            "maxPriorityFeePerGas",
            formatUnits(defaultFees.maxPriorityFeePerGas!, "gwei")
        )
        setValue("maxFeePerGas", formatUnits(defaultFees.maxFeePerGas!, "gwei"))
    }

    const handleGasLimitFocus = () => {
        if (!isCustom) {
            handleCustomChange()
        }
        if (!showGasLimitInput || userExplicitlyHid) {
            justClickedRef.current = true
            setShowGasLimitInput(true)
            setUserRequestedGasLimit(true)
            setUserExplicitlyHid(false)
        }
    }

    const validateGasLimit = (gasLimit?: BigNumber) => {
        setGasLimitWarning(
            gasLimit?.lt(defaultFees.gasLimit!)
                ? `Gas limit lower than suggested (${defaultFees.gasLimit})`
                : ""
        )
    }

    const validateFees = (fees: TransactionFeeData) => {
        clearErrors("maxFeePerGas")

        const baseFee = BigNumber.from(baseFeePerGas)

        validateGasLimit(fees.gasLimit)

        setMaxFeeWarning(
            fees.maxFeePerGas?.lt(baseFee.add(fees.maxPriorityFeePerGas!))
                ? "Max fee lower than base fee + tip"
                : ""
        )

        if (fees.maxFeePerGas?.lt(fees.maxPriorityFeePerGas!)) {
            setError("maxFeePerGas", {
                message: "Max fee lower than the max tip",
            })
        }

        if (
            gasLowerCap &&
            gasLowerCap.maxPriorityFeePerGas &&
            fees.maxFeePerGas?.lt(gasLowerCap.maxPriorityFeePerGas)
        ) {
            setMaxFeeWarning("Max fee lower than network limit")
        }

        setTipWarning(
            fees.maxPriorityFeePerGas?.lt(averageTip)
                ? `Tip lower than suggested tip of ${formatUnits(
                    averageTip,
                    "gwei"
                )} Gwei`
                : ""
        )

        if (
            gasLowerCap &&
            gasLowerCap.maxPriorityFeePerGas &&
            fees.maxPriorityFeePerGas?.lt(gasLowerCap.maxPriorityFeePerGas)
        ) {
            setMaxFeeWarning("Tip lower than network limit")
        }
    }

    const handleBlur = () => {
        const values = getValues()
        const fees: TransactionFeeData = {
            gasLimit: BigNumber.from(
                values.gasLimit === "" ? "0" : values.gasLimit
            ),
            maxPriorityFeePerGas: parseUnits(
                values.maxPriorityFeePerGas === ""
                    ? "0"
                    : values.maxPriorityFeePerGas,
                "gwei"
            ),
            maxFeePerGas: parseUnits(
                values.maxFeePerGas === "" ? "0" : values.maxFeePerGas,
                "gwei"
            ),
        }

        validateFees(fees)
    }

    const handleSave = handleSubmit(async (values: GasAdvancedForm) => {
        const fees: TransactionFeeData = {
            gasLimit: BigNumber.from(values.gasLimit),
            maxPriorityFeePerGas: parseUnits(
                values.maxPriorityFeePerGas,
                "gwei"
            ),
            maxFeePerGas: parseUnits(values.maxFeePerGas, "gwei"),
        }

        const custom = getGasOption("Custom", fees)
        setSelectedGas(custom)
    })

    useEffect(() => {
        const defaultGasLimit = defaultFees.gasLimit?.toString() || "0"
        const selectedGasLimit = selectedOption.gasFees.gasLimit?.toString() || "0"
        const isGasLimitCustom = defaultGasLimit !== selectedGasLimit

        setValue("gasLimit", formatUnits(isCustom ? selectedOption.gasFees.gasLimit! : defaultFees.gasLimit!, "wei"))
        setValue("maxPriorityFeePerGas", formatUnits(isCustom ? selectedOption.gasFees.maxPriorityFeePerGas! : defaultFees.maxPriorityFeePerGas!, "gwei"))
        setValue("maxFeePerGas", formatUnits(isCustom ? selectedOption.gasFees.maxFeePerGas! : defaultFees.maxFeePerGas!, "gwei"))

        if (!userRequestedGasLimit && !userExplicitlyHid && !justClickedRef.current) {
            const shouldShow = isCustom || isGasLimitCustom
            setShowGasLimitInput(shouldShow)
        }

        validateFees(isCustom ? selectedOption.gasFees : defaultFees)

        if (justClickedRef.current) {
            const timer = setTimeout(() => {
                justClickedRef.current = false
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [isCustom, selectedOption.gasFees, defaultFees])

    const inputClasses = (hasError?: boolean, hasWarning?: boolean) =>
        classnames(
            "w-full px-4 py-3 border rounded-lg transition-colors duration-150",
            "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            !isCustom && "text-gray-400 dark:text-gray-500",
            hasError
                ? "border-red-400 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400 focus:ring-1 focus:ring-red-500 dark:focus:ring-red-400"
                : hasWarning
                    ? "border-amber-400 dark:border-amber-600 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-1 focus:ring-amber-500 dark:focus:ring-amber-400"
                    : "border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
        )

    return (
        <div className="flex flex-col w-full h-full">
            <div className="flex-1 px-4 py-4 space-y-6">
                <FormField
                    label="Max Priority Fee (Tip)"
                    tooltip="Max amount added to the base fee that goes directly to the miner."
                    error={errors.maxPriorityFeePerGas?.message}
                    warning={tipWarning}
                >
                    <EndLabel label="GWEI">
                        <input
                            type="text"
                            {...register("maxPriorityFeePerGas")}
                            className={inputClasses(!!errors.maxPriorityFeePerGas, !!tipWarning)}
                            autoComplete="off"
                            onKeyDown={handleKeyDown}
                            onInput={handleChangeAmountGwei((value) => {
                                setValue("maxPriorityFeePerGas", value, {
                                    shouldValidate: true,
                                })
                            })}
                            placeholder={formatUnits(
                                isCustom
                                    ? selectedOption.gasFees.maxPriorityFeePerGas!
                                    : defaultFees.maxPriorityFeePerGas!,
                                "gwei"
                            )}
                            onFocus={() => !isCustom && handleCustomChange()}
                            onBlur={handleBlur}
                            tabIndex={1}
                        />
                    </EndLabel>
                </FormField>

                <FormField
                    label="Max Fee"
                    tooltip="Max total amount (Base Fee + Tip) you are willing to pay per gas unit. You only pay the Base Fee + Tip."
                    error={errors.maxFeePerGas?.message}
                    warning={maxFeeWarning}
                >
                    <EndLabel label="GWEI">
                        <input
                            type="text"
                            {...register("maxFeePerGas")}
                            className={inputClasses(!!errors.maxFeePerGas, !!maxFeeWarning)}
                            autoComplete="off"
                            onKeyDown={handleKeyDown}
                            onInput={handleChangeAmountGwei((value) => {
                                setValue("maxFeePerGas", value, {
                                    shouldValidate: true,
                                })
                            })}
                            placeholder={formatUnits(
                                isCustom
                                    ? selectedOption.gasFees.maxFeePerGas!
                                    : defaultFees.maxFeePerGas!,
                                "gwei"
                            )}
                            onFocus={() => !isCustom && handleCustomChange()}
                            onBlur={handleBlur}
                            tabIndex={2}
                        />
                    </EndLabel>
                </FormField>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
                    <span className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                        Current Base Fee: {formatUnits(baseFeePerGas!, "gwei")} GWEI
                    </span>
                </div>

                {showGasLimitInput ? (
                    <div className="space-y-2">
                        <FormField
                            label="Gas Limit"
                            tooltip="Max amount of gas units your transaction can consume. Standard transfers usually take 21000 units."
                            error={errors.gasLimit?.message}
                            warning={gasLimitWarning}
                        >
                            <input
                                type="text"
                                {...register("gasLimit")}
                                className={inputClasses(!!errors.gasLimit, !!gasLimitWarning)}
                                autoComplete="off"
                                onKeyDown={handleKeyDown}
                                onInput={handleChangeAmountWei((value) => {
                                    if (gasLimitWarning) {
                                        validateGasLimit(BigNumber.from(value ?? "0"))
                                    }
                                    setValue("gasLimit", value, {
                                        shouldValidate: true,
                                    })
                                })}
                                placeholder={formatUnits(
                                    isCustom
                                        ? selectedOption.gasFees.gasLimit!
                                        : defaultFees.gasLimit!,
                                    "wei"
                                )}
                                onFocus={handleGasLimitFocus}
                                onBlur={handleBlur}
                                tabIndex={3}
                            />
                        </FormField>
                        {userRequestedGasLimit && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    justClickedRef.current = true
                                    setUserRequestedGasLimit(false)
                                    setUserExplicitlyHid(true)
                                    setShowGasLimitInput(false)
                                }}
                                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline"
                            >
                                Hide Gas Limit
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => {
                            justClickedRef.current = true
                            setShowGasLimitInput(true)
                            setUserRequestedGasLimit(true)
                            setUserExplicitlyHid(false)
                        }}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium"
                    >
                        Edit Gas Limit (Advanced)
                    </button>
                )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4">
                <Button
                    label="Save"
                    buttonClass="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-150"
                    type="button"
                    onClick={handleSave}
                    disabled={
                        Object.values(errors).filter(
                            (v) => v.message !== ""
                        ).length > 0
                    }
                />
            </div>
        </div>
    )
}

const tabs = [
    {
        label: "Basic",
        component: GasSelectorBasic,
    },
    {
        label: "Advanced",
        component: GasSelectorAdvanced,
    },
]

const GasPriceComponent: FunctionComponent<{
    defaultGas: {
        feeData: TransactionFeeData
        defaultLevel?: "low" | "medium" | "high"
    }
    setGas: (gasFees: TransactionFeeData) => void
    disabled?: boolean
    isParentLoading?: boolean
    showEstimationError?: boolean
    displayOnlyMaxValue?: boolean
    minGasLimit?: string
}> = ({
    defaultGas,
    setGas,
    isParentLoading,
    disabled,
    showEstimationError,
    displayOnlyMaxValue = false,
    minGasLimit,
}) => {
        const ref = useRef(null)
        const [active, setActive] = useState(false)
        useOnClickOutside(ref, () => setActive(false))

        const { exchangeRates, nativeCurrency, localeInfo, networkNativeCurrency } =
            useBlankState()!

        const { estimatedBaseFee: baseFeePerGas, gasPricesLevels } =
            useGasPriceData()

        useEffect(() => {
            const interval = setInterval(() => {
                updateGasPrices()
            }, GAS_PRICE_UPDATE_INTERVAL)
            return () => {
                clearInterval(interval)
            }
        }, [])

        const {
            defaultNetworkLogo,
            nativeCurrency: {
                decimals: nativeCurrencyDecimals,
                logo: nativeCurrencyLogo,
            },
        } = useSelectedNetwork()

        const [baseFee, setBaseFee] = useState<BigNumber>(
            BigNumber.from(baseFeePerGas)
        )

        const [showEstimationWarning, setShowEstimationWarning] = useState(
            showEstimationError ?? false
        )

        const [transactionSpeeds, setTransactionSpeeds] =
            useState<TransactionSpeed>(getTransactionSpeeds(gasPricesLevels))

        const getGasOption = (label: string, gasFees: TransactionFeeData) => {
            const {
                minValue,
                maxValue,
                minValueNativeCurrency,
                maxValueNativeCurrency,
            } = calculateGasPricesFromTransactionFees(gasFees, baseFee, {
                exchangeRates,
                localeInfo: {
                    currency: nativeCurrency,
                    language: localeInfo,
                },
                networkNativeCurrency: {
                    symbol: networkNativeCurrency.symbol,
                    decimals: nativeCurrencyDecimals,
                },
            })

            const minValueFormatted = formatRounded(
                formatUnits(minValue.lt(maxValue) ? minValue : maxValue),
                5
            )

            const maxValueFormatted = formatRounded(
                formatUnits(minValue.gt(maxValue) ? minValue : maxValue),
                5
            )

            const networkSymbol = networkNativeCurrency.symbol

            const totalETHCost =
                (label !== "Custom" || minValue.lte(maxValue)) &&
                    !displayOnlyMaxValue
                    ? `${minValueFormatted} ${networkSymbol} - ${maxValueFormatted} ${networkSymbol}`
                    : `${formatRounded(formatUnits(maxValue), 5)} ${networkSymbol}`

            const totalNativeCurrencyCost =
                (label !== "Custom" || minValue.lte(maxValue)) &&
                    !displayOnlyMaxValue
                    ? `${minValueNativeCurrency} - ${maxValueNativeCurrency}`
                    : maxValueNativeCurrency

            const totalETHCostRange =
                label !== "Custom" || minValue.lte(maxValue)
                    ? `${minValueFormatted} ${networkNativeCurrency.symbol} - ${maxValueFormatted} ${networkNativeCurrency.symbol}`
                    : `${formatRounded(formatUnits(maxValue), 5)} ${networkNativeCurrency.symbol
                    }`

            const totalNativeCurrencyCostRange =
                label !== "Custom" || minValue.lte(maxValue)
                    ? `${minValueNativeCurrency} - ${maxValueNativeCurrency}`
                    : maxValueNativeCurrency

            return {
                label,
                gasFees,
                totalETHCost,
                totalNativeCurrencyCost,
                totalETHCostRange,
                totalNativeCurrencyCostRange,
            } as GasPriceOption
        }

        const [gasOptions, setGasOptions] = useState<GasPriceOption[]>([])

        const [selectedGas, setSelectedGas] = useState<GasPriceOption>()

        const [tab, setTab] = useState(tabs[!defaultGas.defaultLevel ? 1 : 0])
        const TabComponent = tab.component
        const [isLoaded, setIsLoaded] = useState<boolean>(false)

        useEffect(() => {
            if (isParentLoading) {
                if (isLoaded) setIsLoaded(false)

                return
            }

            setTransactionSpeeds(getTransactionSpeeds(gasPricesLevels))

            let speedOptions: GasPriceOption[] = []
            for (let speed in transactionSpeeds) {
                speedOptions.push(
                    getGasOption(speed, {
                        gasLimit: defaultGas.feeData.gasLimit,
                        maxPriorityFeePerGas:
                            transactionSpeeds[speed].maxPriorityFeePerGas,
                        maxFeePerGas: transactionSpeeds[speed].maxFeePerGas,
                    })
                )
            }
            setGasOptions(speedOptions)

            if (!isLoaded) {
                if (defaultGas.defaultLevel) {
                    const defaultOption = speedOptions.find(
                        (s) => s.label === defaultGas.defaultLevel
                    )

                    if (defaultOption) {
                        setSelectedGas(defaultOption)
                        setGas(defaultOption.gasFees!)
                        setTab(tabs[0])
                    }
                } else {
                    const defaultOption = getGasOption("Custom", defaultGas.feeData)
                    setSelectedGas(defaultOption)
                    setGas(defaultOption.gasFees!)
                    setTab(tabs[1])
                }
            }

            setIsLoaded(true)

            if (isLoaded && selectedGas!.label !== "Custom") {
                const selected = speedOptions.find(
                    (s) => s.label === selectedGas!.label
                )
                if (selected) {
                    setSelectedGas(selected)
                    setGas(selectedGas!.gasFees!)
                }
            }
        }, [isParentLoading, gasPricesLevels, defaultGas.feeData.gasLimit])

        useEffect(() => {
            setBaseFee(BigNumber.from(baseFeePerGas))
        }, [baseFeePerGas])

        useEffect(() => {
            if (showEstimationError && !showEstimationWarning)
                setShowEstimationWarning(true)
        }, [showEstimationError])

        return (
            <>
                <div
                    className={classnames(
                        "p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                        active
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700",
                        disabled && "pointer-events-none opacity-50"
                    )}
                    onClick={() =>
                        !disabled &&
                        !isParentLoading &&
                        isLoaded &&
                        setActive(!active)
                    }
                >
                    <div
                        className={classnames(
                            "flex justify-between w-full items-center",
                            displayOnlyMaxValue && "space-x-4"
                        )}
                    >
                        <div className="flex-1">
                            <div
                                className={classnames(
                                    "text-sm font-semibold text-gray-900 dark:text-gray-100",
                                    (isParentLoading || !isLoaded) && "w-32"
                                )}
                            >
                                {isParentLoading || !isLoaded
                                    ? "Loading prices..."
                                    : capitalize(selectedGas!.label)}
                            </div>

                            <div className="flex flex-row w-full items-center justify-start mt-2 space-x-4 text-sm">
                                {!isParentLoading &&
                                    isLoaded &&
                                    (displayOnlyMaxValue ? (
                                        <div className="flex flex-row w-full items-center space-x-4">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                                                {selectedGas!.totalNativeCurrencyCost}
                                            </span>
                                            <div className="flex flex-row space-x-2 items-center">
                                                <img
                                                    src={
                                                        nativeCurrencyLogo ??
                                                        defaultNetworkLogo
                                                    }
                                                    alt={networkNativeCurrency.symbol}
                                                    width="16px"
                                                    className="rounded-full"
                                                    draggable={false}
                                                />
                                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                    {selectedGas!.totalETHCost}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                                                {selectedGas!.totalNativeCurrencyCost}
                                            </span>
                                            <div className="flex flex-row space-x-2 items-center">
                                                <img
                                                    src={
                                                        nativeCurrencyLogo ??
                                                        defaultNetworkLogo
                                                    }
                                                    alt={networkNativeCurrency.symbol}
                                                    width="16px"
                                                    className="rounded-full"
                                                    draggable={false}
                                                />
                                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                    {selectedGas!.totalETHCost}
                                                </span>
                                            </div>
                                        </>
                                    ))}
                            </div>
                        </div>
                        <div className="flex justify-end items-center">
                            {isParentLoading || !isLoaded ? (
                                <Spinner />
                            ) : (
                                <ArrowUpDown active={active} />
                            )}
                        </div>
                    </div>
                </div>

                <WarningDialog
                    open={showEstimationWarning}
                    onDone={() => setShowEstimationWarning(false)}
                    title="Gas estimation failed"
                    message="The provided gas estimation could be incorrect. Please review gas settings before submitting."
                />

                <Dialog open={active} onClickOutside={() => setActive(false)}>
                    <span className="absolute top-0 right-0 p-4 z-50">
                        <div
                            onClick={() => setActive(false)}
                            className="cursor-pointer p-2 ml-auto -mr-2 text-gray-900 dark:text-gray-100 transition duration-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <CloseIcon size="10" />
                        </div>
                    </span>
                    <div className="flex flex-col w-full h-full">
                        <div className="flex flex-row items-center space-x-3 px-4 py-3">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Gas Price
                            </h2>
                            <div className="group relative">
                                <a
                                    href="https://ethereum.org/en/developers/docs/gas/"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center"
                                >
                                    <AiFillInfoCircle className="w-5 h-5 text-gray-600 dark:text-gray-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-150" />
                                </a>
                                <Tooltip
                                    placement="bottom"
                                    align="center"
                                    autoFlip
                                    content={
                                        <div className="flex flex-col font-normal items-start text-xs space-y-1">
                                            <span>Gas is used to operate on the network.</span>
                                            <span>Click on this icon to learn more.</span>
                                        </div>
                                    }
                                />
                            </div>
                        </div>

                        <HorizontalSelect
                            options={tabs}
                            value={tab}
                            onChange={setTab}
                            display={(t) => t.label}
                            disableStyles
                            optionClassName={(value) =>
                                `flex-1 flex flex-row items-center justify-center p-3 text-sm font-medium transition-colors duration-150
                                ${tab === value
                                    ? "border-blue-600 dark:border-blue-400 border-b-2 text-blue-600 dark:text-blue-400"
                                    : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 border-b hover:text-blue-600 dark:hover:text-blue-400"
                                }`
                            }
                            containerClassName="flex flex-row border-b border-gray-200 dark:border-gray-700"
                            containerStyle={{
                                width: "100%",
                            }}
                        />

                        <div className="flex-1 overflow-hidden">
                            <TabComponent
                                symbol={networkNativeCurrency.symbol}
                                nativeCurrencyIcon={
                                    nativeCurrencyLogo ?? defaultNetworkLogo
                                }
                                options={gasOptions}
                                gasFees={defaultGas.feeData}
                                selectedOption={selectedGas!}
                                setSelectedGas={(option: GasPriceOption) => {
                                    setSelectedGas(option)
                                    setGas(option.gasFees)
                                    setShowEstimationWarning(false)
                                    setActive(false)
                                }}
                                minGasLimit={minGasLimit}
                                getGasOption={getGasOption}
                            />
                        </div>
                    </div>
                </Dialog>
            </>
        )
    }

export default memo(GasPriceComponent)
