import {
    FunctionComponent,
    useRef,
    useState,
    useEffect,
    useMemo,
    useCallback,
} from "react"
import classnames from "classnames"
import { BigNumber } from "@ethersproject/bignumber"

import { formatUnits, parseUnits } from "@ethersproject/units"
import * as yup from "yup"
import { InferType } from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import { GasPriceLevels } from "@block-wallet/background/controllers/GasPricesController"
import { TransactionFeeData } from "@block-wallet/background/controllers/erc-20/transactions/SignedTransaction"

// Components
import HorizontalSelect from "../input/HorizontalSelect"
import Tooltip from "../../components/label/Tooltip"
import { AiFillInfoCircle } from "react-icons/ai"
import { ImCheckmark } from "react-icons/im"
import Spinner from "../spinner/Spinner"
import Dialog from "../dialog/Dialog"
import EndLabel from "../input/EndLabel"
import { ButtonWithLoading as Button } from "../button/ButtonWithLoading"

// Utils
import { capitalize } from "../../util/capitalize"
import {
    handleKeyDown,
    handleChangeAmountGwei,
    handleChangeAmountWei,
    makeStringNumberFormField,
} from "../../util/form"
import { useOnClickOutside } from "../../util/useOnClickOutside"
import { formatRounded } from "../../util/formatRounded"

// Assets
import { Classes } from "../../styles"
import { ArrowUpDown } from "../icons/ArrowUpDown"
import CloseIcon from "../icons/CloseIcon"

// Context
import { useBlankState } from "../../context/background/backgroundHooks"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import WarningDialog from "../dialog/WarningDialog"
import { calculateGasPricesFromTransactionFees } from "../../util/gasPrice"
import { useExchangeRatesState } from "../../context/background/useExchangeRatesState"

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
    //EIP-1559: range
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
// Basic Tab. Shows 3 levels of gas calculated with values received from state.
const GasSelectorBasic = (props: GasComponentProps) => {
    const { selectedOption, options, setSelectedGas } = props

    return (
        <div className="flex flex-col w-full">
            <div className="flex flex-col w-full space-y">
                {options.map((option, i) => (
                    <div
                        key={option.label}
                        className="w-full flex flex-row items-center p-1 cursor-pointer rounded-md hover:bg-gray-100"
                        onClick={() => {
                            setSelectedGas(option)
                        }}
                    >
                        <div className="flex flex-col flex-grow px-1 py-1  w-11/12">
                            <label
                                className={classnames(
                                    "text-base font-semibold cursor-pointer capitalize",
                                    selectedOption.label === option.label &&
                                        "text-primary-300"
                                )}
                            >
                                {option.label}
                            </label>
                            <div className="flex flex-col w-full justify-between py-2 space-y-1">
                                <div className="flex flex-row justify-between items-center">
                                    <span
                                        className={classnames(
                                            "text-xs",
                                            selectedOption.label ===
                                                option.label &&
                                                "text-primary-300"
                                        )}
                                    >
                                        {option.totalNativeCurrencyCostRange}
                                    </span>
                                    <div>
                                        <ImCheckmark
                                            className={classnames(
                                                "text-sm",
                                                selectedOption.label ===
                                                    option.label
                                                    ? "text-primary-300"
                                                    : "hidden"
                                            )}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <span
                                        className={classnames(
                                            "text-gray-600 text-xs",
                                            selectedOption.label ===
                                                option.label &&
                                                "!text-primary-300"
                                        )}
                                    >
                                        {option.totalETHCostRange}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Schema
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

// Advanced tab. Allows users to enter manual fee values.
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

    return (
        <div className="flex flex-col w-full">
            <div className="flex flex-col w-full space-y-3 px-3 pb-3">
                <div className="flex flex-col">
                    <label className="leading-loose text-xs font-medium mb-1 text-gra">
                        Gas limit
                    </label>
                    <input
                        type="text"
                        {...register("gasLimit", {
                            pattern: /[0-9]/g,
                        })}
                        className={classnames(
                            Classes.inputBordered,
                            "w-full",
                            !isCustom && "text-gray-400",
                            errors.gasLimit
                                ? "border-red-400 focus:border-red-600"
                                : gasLimitWarning
                                ? "border-yellow-400 focus:border-yellow-600"
                                : ""
                        )}
                        autoComplete="off"
                        onKeyDown={handleKeyDown}
                        onInput={handleChangeAmountWei((value) => {
                            //If there was a warning, then check whether we need to clean it or not.
                            //If there weren't, lets validate that onBlur to avoid showing and clearing error everytime.
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
                        onFocus={() => {
                            !isCustom && handleCustomChange()
                        }}
                        onBlur={() => {
                            handleBlur()
                        }}
                        tabIndex={1}
                    />

                    {/* ERROR */}
                    <span
                        className={classnames(
                            "text-xs",
                            errors.gasLimit
                                ? "text-red-500"
                                : gasLimitWarning
                                ? "text-yellow-500"
                                : "m-0 h-0"
                        )}
                    >
                        {errors.gasLimit?.message || gasLimitWarning || ""}
                    </span>
                </div>
                <div className="flex flex-col relative">
                    <label className="leading-loose text-xs font-medium  mb-1">
                        Max tip (per gas unit)
                    </label>
                    <EndLabel label="GWEI">
                        <input
                            type="text"
                            {...register("maxPriorityFeePerGas", {
                                pattern: /[0-9.]/g,
                            })}
                            className={classnames(
                                Classes.inputBordered,
                                "w-full",
                                !isCustom && "text-gray-400",
                                errors.maxPriorityFeePerGas
                                    ? "border-red-400 focus:border-red-600"
                                    : tipWarning
                                    ? "border-yellow-400 focus:border-yellow-600"
                                    : ""
                            )}
                            autoComplete="off"
                            onKeyDown={handleKeyDown}
                            onInput={handleChangeAmountGwei((value) => {
                                setValue("maxPriorityFeePerGas", value, {
                                    shouldValidate: true,
                                })
                            })}
                            placeholder={formatUnits(
                                isCustom
                                    ? selectedOption.gasFees
                                          .maxPriorityFeePerGas!
                                    : defaultFees.maxPriorityFeePerGas!,
                                "gwei"
                            )}
                            onFocus={() => {
                                !isCustom && handleCustomChange()
                            }}
                            onBlur={() => {
                                handleBlur()
                            }}
                            tabIndex={2}
                        />
                    </EndLabel>
                    {/* ERROR */}
                    <span
                        className={classnames(
                            "text-xs",
                            errors.maxPriorityFeePerGas
                                ? "text-red-500"
                                : tipWarning
                                ? "text-yellow-500"
                                : "m-0 h-0"
                        )}
                    >
                        {errors.maxPriorityFeePerGas?.message ||
                            tipWarning ||
                            ""}
                    </span>
                </div>
                <div className="flex flex-col relative">
                    <label className="leading-loose text-xs font-medium  mb-1">
                        Max fee (per gas unit)
                    </label>
                    <EndLabel label="GWEI">
                        <input
                            type="text"
                            {...register("maxFeePerGas", {
                                pattern: /[0-9.]/g,
                            })}
                            className={classnames(
                                Classes.inputBordered,
                                "w-full",
                                !isCustom && "text-gray-400",
                                !!errors.maxFeePerGas?.message
                                    ? "border-red-400 focus:border-red-600"
                                    : maxFeeWarning
                                    ? "border-yellow-400 focus:border-yellow-600"
                                    : ""
                            )}
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
                            onFocus={() => {
                                !isCustom && handleCustomChange()
                            }}
                            onBlur={() => {
                                handleBlur()
                            }}
                            tabIndex={3}
                        />
                    </EndLabel>
                    {/* ERROR */}
                    <span
                        className={classnames(
                            "text-xs",
                            !!errors.maxFeePerGas?.message
                                ? "text-red-500"
                                : maxFeeWarning
                                ? "text-yellow-500"
                                : "m-0 h-0"
                        )}
                    >
                        {errors.maxFeePerGas?.message || maxFeeWarning || ""}
                    </span>
                </div>
                <span className="text-gray-500 text-xs">
                    Last base fee: {formatUnits(baseFeePerGas!, "gwei")} GWEI
                </span>
            </div>
            <div>
                <hr className="absolute left-0 border-0.5 border-gray-200 w-full" />
                <div className="flex flex-row w-full items-center pt-5 justify-between space-x-4 mt-auto px-4">
                    <Button
                        label="Save"
                        buttonClass={Classes.button}
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

// Main Component
const GasPriceComponent: FunctionComponent<{
    defaultGas: {
        feeData: TransactionFeeData
        defaultLevel?: "low" | "medium" | "high"
    } // can receive either custom values (i.e. dApps or estimation) or a level to set as default basic value
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
    //Popup variables
    const ref = useRef(null)
    const [active, setActive] = useState(false)
    useOnClickOutside(ref, () => setActive(false))

    //State
    const { nativeCurrency, localeInfo } = useBlankState()!
    const {
        state: { exchangeRates, networkNativeCurrency },
    } = useExchangeRatesState()

    const { estimatedBaseFee: baseFeePerGas, gasPricesLevels } =
        useGasPriceData()

    const {
        defaultNetworkLogo,
        nativeCurrency: { decimals: nativeCurrencyDecimals },
    } = useSelectedNetwork()

    const [baseFee, setBaseFee] = useState<BigNumber>(
        BigNumber.from(baseFeePerGas)
    )

    const [showEstimationWarning, setShowEstimationWarning] = useState(
        showEstimationError ?? false
    )

    const [transactionSpeeds, setTransactionSpeeds] =
        useState<TransactionSpeed>(getTransactionSpeeds(gasPricesLevels))

    const getGasOption = useCallback(
        (label: string, gasFees: TransactionFeeData) => {
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

            // For parent's label, apply displayOnlyMaxValue flag. Otherwise always display range
            const totalETHCost =
                (label !== "Custom" || minValue.lte(maxValue)) &&
                !displayOnlyMaxValue
                    ? `${minValueFormatted} ${networkSymbol} - ${maxValueFormatted} ${networkSymbol}`
                    : `${formatRounded(
                          formatUnits(maxValue),
                          5
                      )} ${networkSymbol}`

            const totalNativeCurrencyCost =
                (label !== "Custom" || minValue.lte(maxValue)) &&
                !displayOnlyMaxValue
                    ? `${minValueNativeCurrency} - ${maxValueNativeCurrency}`
                    : maxValueNativeCurrency

            const totalETHCostRange =
                label !== "Custom" || minValue.lte(maxValue)
                    ? `${minValueFormatted} ${networkNativeCurrency.symbol} - ${maxValueFormatted} ${networkNativeCurrency.symbol}`
                    : `${formatRounded(formatUnits(maxValue), 5)} ${
                          networkNativeCurrency.symbol
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
        },
        [
            baseFee,
            displayOnlyMaxValue,
            exchangeRates,
            localeInfo,
            nativeCurrency,
            nativeCurrencyDecimals,
            networkNativeCurrency.symbol,
        ]
    )

    const [gasOptions, setGasOptions] = useState<GasPriceOption[]>([])

    // Selected gas state
    const [selectedGas, setSelectedGas] = useState<GasPriceOption>()

    // Tabs variables
    const [tab, setTab] = useState(tabs[!defaultGas.defaultLevel ? 1 : 0])
    const TabComponent = tab.component
    const [isLoaded, setIsLoaded] = useState<boolean>(false)

    // Effects
    useEffect(() => {
        // Waits till parent component finishes loading (estimation and transaction values)
        if (isParentLoading) {
            // This means there was a change on parent component that is updating values so we should reload all values.
            if (isLoaded) setIsLoaded(false)

            // keeps waiting for parent to finish
            return
        }

        //Update transaction speeds
        setTransactionSpeeds(getTransactionSpeeds(gasPricesLevels))

        //Get & set gas options
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

        // First load will check if comp received default values or level
        if (!isLoaded) {
            // If the default gas was set to a basic level, update the selected option with the new gas values
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
                // If the default gas was set to custom values, update them and set the advance tab as active
                const defaultOption = getGasOption("Custom", defaultGas.feeData)
                setSelectedGas(defaultOption)
                setGas(defaultOption.gasFees!)
                setTab(tabs[1])
            }
        }

        setIsLoaded(true)

        //Updated selected gas on gas price change
        if (isLoaded && selectedGas!.label !== "Custom") {
            const selected = speedOptions.find(
                (s) => s.label === selectedGas!.label
            )
            if (selected) {
                setSelectedGas(selected)
                setGas(selectedGas!.gasFees!)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isParentLoading,
        gasPricesLevels,
        defaultGas.feeData.gasLimit,
        getGasOption,
    ])

    useEffect(() => {
        setBaseFee(BigNumber.from(baseFeePerGas))
    }, [baseFeePerGas])

    // Effect to check if estimation failed when switching to a new tx
    useEffect(() => {
        if (showEstimationError && !showEstimationWarning)
            setShowEstimationWarning(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showEstimationError])

    return (
        <>
            {/* Label */}
            <div
                className={classnames(
                    Classes.blueSection,
                    active && Classes.blueSectionActive,
                    disabled && "pointer-events-none"
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
                        "flex justify-start w-full items-center",
                        displayOnlyMaxValue && "space-x-4"
                    )}
                >
                    <div
                        className={classnames(
                            "text-xs font-semibold",
                            (isParentLoading || !isLoaded) && "w-56"
                        )}
                    >
                        {isParentLoading || !isLoaded
                            ? "Loading prices..."
                            : capitalize(selectedGas!.label)}
                    </div>

                    <div className="flex flex-row w-full items-center justify-around text-xs">
                        {!isParentLoading &&
                            isLoaded &&
                            (displayOnlyMaxValue ? (
                                <div className="flex flex-row w-full items-center space-x-4">
                                    <span className="text-xs text-gray-600">
                                        {selectedGas!.totalNativeCurrencyCost}
                                    </span>
                                    <div className="flex flex-row space-x-1 items-center">
                                        <img
                                            src={defaultNetworkLogo}
                                            alt={networkNativeCurrency.symbol}
                                            width="20px"
                                            draggable={false}
                                        />
                                        <span className="text-xs">
                                            {selectedGas!.totalETHCost}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <span className="text-xs text-gray-600">
                                        {selectedGas!.totalNativeCurrencyCost}
                                    </span>
                                    <div className="flex flex-row space-x-1 items-center justify-self-end">
                                        <div className="justify-self-start">
                                            <img
                                                src={defaultNetworkLogo}
                                                alt={
                                                    networkNativeCurrency.symbol
                                                }
                                                width="20px"
                                                draggable={false}
                                            />
                                        </div>
                                        <div className="w-full">
                                            <span className="text-xs">
                                                {selectedGas!.totalETHCost}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ))}
                    </div>
                </div>
                <div className="flex justify-end items-center w-4 h-full">
                    {isParentLoading || !isLoaded ? (
                        <Spinner />
                    ) : (
                        <ArrowUpDown active={active} />
                    )}
                </div>
            </div>
            <WarningDialog
                open={showEstimationWarning}
                onDone={() => setShowEstimationWarning(false)}
                title="Gas estimation failed"
                message="The provided gas estimation could be incorrect. Please review gas settings before submitting."
            />
            {/* Modal */}

            <Dialog open={active} onClickOutside={() => setActive(false)}>
                <span className="absolute top-0 right-0 p-4 z-50">
                    <div
                        onClick={() => setActive(false)}
                        className=" cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
                    >
                        <CloseIcon size="10" />
                    </div>
                </span>
                <div>
                    <div className="flex flex-col w-full space-y-2">
                        <div className="z-10 flex flex-row items-center p-2 bg-white bg-opacity-75">
                            <h2 className="p-0 text-lg font-bold">Gas Price</h2>
                            <div className="group relative">
                                <a
                                    href="https://ethereum.org/en/developers/docs/gas/"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <AiFillInfoCircle
                                        size={26}
                                        className="pl-2 text-primary-200 cursor-pointer hover:text-primary-300"
                                    />
                                </a>
                                <Tooltip
                                    content={
                                        <div className="flex flex-col font-normal items-start text-xs text-white-500">
                                            <div className="flex flex-row items-end space-x-7">
                                                <span>
                                                    Gas is used to operate on
                                                    the network.
                                                </span>{" "}
                                            </div>
                                            <div className="flex flex-row items-end space-x-4">
                                                <span>
                                                    Click on this icon to learn
                                                    more.
                                                </span>{" "}
                                            </div>
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
                                `flex-1 flex flex-row items-center justify-center p-3 text-sm
                                            ${
                                                tab === value
                                                    ? "border-primary-300 border-b-2 text-primary-300 font-bold"
                                                    : "border-gray-200 text-gray-500 border-b"
                                            }`
                            }
                            containerClassName="flex flex-row -ml-3"
                            containerStyle={{
                                width: "calc(100% + 1.5rem)",
                            }}
                        />
                        <TabComponent
                            symbol={networkNativeCurrency.symbol}
                            nativeCurrencyIcon={defaultNetworkLogo}
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
                {/*</div>*/}
            </Dialog>
        </>
    )
}

export default GasPriceComponent
