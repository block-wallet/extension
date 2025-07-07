import { useState, useEffect, useRef } from "react"
import { ImCheckmark } from "react-icons/im"
import { BigNumber } from "@ethersproject/bignumber"
import classnames from "classnames"
import { parseUnits } from "@ethersproject/units"
import { formatUnits } from "@ethersproject/units"
import { GasPriceLevels } from "@block-wallet/background/controllers/GasPricesController"
import * as yup from "yup"
import { InferType } from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import { AiFillInfoCircle } from "react-icons/ai"
import { TransactionFeeData } from "@block-wallet/background/controllers/erc-20/transactions/SignedTransaction"

import HorizontalSelect from "../input/HorizontalSelect"
import Tooltip from "../../components/label/Tooltip"
import Spinner from "../spinner/Spinner"
import Dialog from "../dialog/Dialog"
import { ArrowUpDown } from "../icons/ArrowUpDown"
import EndLabel from "../input/EndLabel"
import WarningDialog from "../dialog/WarningDialog"

import { Classes } from "../../styles/classes"
import CloseIcon from "../icons/CloseIcon"

import { capitalize } from "../../util/capitalize"
import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import {
    makeStringNumberFormField,
    handleKeyDown,
    handleChangeAmountGwei,
    handleChangeAmountWei,
} from "../../util/form"
import { useOnClickOutside } from "../../util/useOnClickOutside"
import { formatRounded } from "../../util/formatRounded"

import { useBlankState } from "../../context/background/backgroundHooks"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import { updateGasPrices } from "../../context/commActions"

import { GAS_PRICE_UPDATE_INTERVAL } from "../../util/constants"

export type TransactionSpeed = {
    [key: string]: BigNumber
}

export type TransactionSpeedOption = {
    label: string
    ethTotalCost: string
    gasPrice: BigNumber
    gasLimit: BigNumber
    nativeCurrencyAmount: string
}

interface GasPriceSelectorProps {
    defaultGasLimit: BigNumber
    defaultGasPrice: BigNumber
    defaultLevel: "low" | "medium" | "high"
    setGasPriceAndLimit: (gasPrice: BigNumber, gasLimit: BigNumber) => void
    disabled?: boolean
    isParentLoading?: boolean
    showEstimationError?: boolean
}

interface GasTabProps {
    nativeCurrencyLogo: string
    symbol: string
    options: TransactionSpeedOption[]
    selectedGasPrice: TransactionSpeedOption
    defaultGasLimit: BigNumber
    defaultGasPrice: BigNumber
    minGasLimit?: number
    setUserChanged: (userChanged: boolean) => void
    handlePriceSelection: (price: TransactionSpeedOption) => void
    getSpeedOption: (
        label: string,
        price: BigNumber,
        limit: BigNumber
    ) => TransactionSpeedOption
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
                    <Tooltip content={tooltip} />
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

const schema = yup.object({
    gasLimit: makeStringNumberFormField("Gas limit is required", false),
    gasPrice: makeStringNumberFormField("Gas price is required", true),
})
type GasAdvancedForm = InferType<typeof schema>

const GasSelectorAdvanced = (props: GasTabProps) => {
    const {
        selectedGasPrice,
        defaultGasLimit,
        defaultGasPrice,
        setUserChanged,
        getSpeedOption,
        handlePriceSelection,
    } = props

    const { gasLowerCap } = useSelectedNetwork()

    const [isCustom, setIsCustom] = useState<boolean>(
        selectedGasPrice.label === "Custom"
    )

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<GasAdvancedForm>({
        defaultValues: {
            gasLimit: formatUnits(
                isCustom ? selectedGasPrice.gasLimit! : defaultGasLimit,
                "wei"
            ),
            gasPrice: formatUnits(
                isCustom ? selectedGasPrice.gasPrice! : defaultGasPrice,
                "gwei"
            ),
        },
        resolver: yupResolver(schema),
    })

    const validateFees = (fees: TransactionFeeData) => {
        setGasLimitWarning("")
        setGasPriceWarning("")

        if (fees.gasLimit?.lt(defaultGasLimit)) {
            setGasLimitWarning("Gas limit lower than suggested")
        }

        if (
            gasLowerCap &&
            gasLowerCap.gasPrice &&
            fees.gasPrice?.lt(gasLowerCap.gasPrice)
        ) {
            setGasPriceWarning("Max fee lower than network limit")
        }
    }

    const handleBlur = () => {
        const values = getValues()

        const fees: TransactionFeeData = {
            gasLimit: BigNumber.from(
                values.gasLimit === "" ? "0" : values.gasLimit
            ),
            gasPrice: parseUnits(
                values.gasPrice === "" ? "0" : values.gasPrice,
                "gwei"
            ),
        }

        validateFees(fees)
    }

    const handleSave = handleSubmit(async (values: GasAdvancedForm) => {
        const fees: TransactionFeeData = {
            gasLimit: BigNumber.from(values.gasLimit),
            gasPrice: parseUnits(values.gasPrice, "gwei"),
        }

        handlePriceSelection(
            getSpeedOption("Custom", fees.gasPrice!, fees.gasLimit!)
        )
    })

    const [gasPriceWarning, setGasPriceWarning] = useState("")
    const [gasLimitWarning, setGasLimitWarning] = useState("")

    const handleCustomChange = () => {
        setIsCustom(true)
        setValue("gasLimit", formatUnits(defaultGasLimit, "wei"))
        setValue("gasPrice", formatUnits(defaultGasPrice, "gwei"))
    }

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
                    label="Gas Price"
                    error={errors.gasPrice?.message}
                    warning={gasPriceWarning}
                >
                    <EndLabel label="GWEI">
                        <input
                            {...register("gasPrice")}
                            autoComplete="off"
                            className={inputClasses(!!errors.gasPrice, !!gasPriceWarning)}
                            type="text"
                            onKeyDown={handleKeyDown}
                            placeholder={formatUnits(
                                isCustom
                                    ? selectedGasPrice.gasPrice
                                    : defaultGasPrice,
                                "gwei"
                            )}
                            onInput={handleChangeAmountGwei((value) => {
                                setValue("gasPrice", value, {
                                    shouldValidate: true,
                                })
                                setUserChanged(true)
                            })}
                            onFocus={() => {
                                !isCustom && handleCustomChange()
                            }}
                            onBlur={() => {
                                handleBlur()
                            }}
                        />
                    </EndLabel>
                </FormField>

                <FormField
                    label="Gas Limit"
                    error={errors.gasLimit?.message}
                    warning={gasLimitWarning}
                >
                    <EndLabel label="WEI">
                        <input
                            autoComplete="off"
                            {...register("gasLimit")}
                            className={inputClasses(!!errors.gasLimit, !!gasLimitWarning)}
                            type="text"
                            onKeyDown={handleKeyDown}
                            placeholder={formatUnits(
                                isCustom
                                    ? selectedGasPrice.gasLimit
                                    : defaultGasLimit,
                                "wei"
                            )}
                            onInput={handleChangeAmountWei((value) => {
                                setValue("gasLimit", value, {
                                    shouldValidate: true,
                                })
                                setUserChanged(true)
                            }, defaultGasLimit.toString())}
                            onFocus={() => {
                                !isCustom && handleCustomChange()
                            }}
                            onBlur={() => {
                                handleBlur()
                            }}
                        />
                    </EndLabel>
                </FormField>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4">
                <button
                    type="button"
                    className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-150 disabled:opacity-50"
                    onClick={handleSave}
                >
                    Save
                </button>
            </div>
        </div>
    )
}

const GasSelectorBasic = (props: GasTabProps) => {
    const {
        options,
        selectedGasPrice,
        handlePriceSelection,
        nativeCurrencyLogo,
        symbol,
    } = props

    return (
        <div className="p-4 space-y-2">
            {options.map((price: TransactionSpeedOption, i) => {
                return (
                    <div
                        className="w-full flex flex-row items-center justify-between cursor-pointer rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 p-3 transition-colors duration-150"
                        key={i}
                        onClick={() => {
                            handlePriceSelection(price)
                        }}
                    >
                        <div className="flex flex-col flex-grow space-y-2">
                            <div className="flex items-center justify-between">
                                <label
                                    className={classnames(
                                        "text-base font-semibold cursor-pointer capitalize",
                                        selectedGasPrice.label === price.label
                                            ? "text-blue-600 dark:text-blue-400"
                                            : "text-gray-900 dark:text-gray-100"
                                    )}
                                >
                                    {price.label}
                                </label>
                                <ImCheckmark
                                    className={classnames(
                                        "w-4 h-4",
                                        selectedGasPrice.label === price.label
                                            ? "text-blue-600 dark:text-blue-400"
                                            : "invisible"
                                    )}
                                />
                            </div>
                            <div className="flex flex-row items-center justify-between">
                                <span
                                    className={classnames(
                                        "text-sm font-medium",
                                        selectedGasPrice.label === price.label
                                            ? "text-blue-600 dark:text-blue-400"
                                            : "text-gray-700 dark:text-gray-300"
                                    )}
                                >
                                    {price.nativeCurrencyAmount}
                                </span>
                                <div className="flex flex-row space-x-2 items-center">
                                    <img
                                        src={nativeCurrencyLogo}
                                        alt={symbol}
                                        width="16px"
                                        className="rounded-full"
                                        draggable={false}
                                    />
                                    <span
                                        className={classnames(
                                            "text-sm font-medium",
                                            selectedGasPrice.label === price.label
                                                ? "text-blue-600 dark:text-blue-400"
                                                : "text-gray-700 dark:text-gray-300"
                                        )}
                                    >
                                        {price.ethTotalCost}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
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

const getTransactionSpeeds = (gasPrices: GasPriceLevels) => {
    return {
        low: BigNumber.from(gasPrices.slow.gasPrice!),
        medium: BigNumber.from(gasPrices.average.gasPrice!),
        high: BigNumber.from(gasPrices.fast.gasPrice!),
    }
}

export const GasPriceSelector = (props: GasPriceSelectorProps) => {
    const ref = useRef(null)
    const [active, setActive] = useState(false)
    useOnClickOutside(ref, () => setActive(false))
    const [isLoaded, setIsLoaded] = useState<boolean>(false)

    const {
        defaultGasLimit,
        defaultGasPrice,
        defaultLevel,
        setGasPriceAndLimit,
        disabled,
        isParentLoading = props.isParentLoading ?? false,
    } = props

    const [showEstimationWarning, setShowEstimationWarning] = useState(
        props.showEstimationError ?? false
    )

    const { nativeCurrency, localeInfo, exchangeRates, networkNativeCurrency } =
        useBlankState()!

    const { gasPricesLevels } = useGasPriceData()

    useEffect(() => {
        const interval = setInterval(() => {
            updateGasPrices()
        }, GAS_PRICE_UPDATE_INTERVAL)
        return () => {
            clearInterval(interval)
        }
    }, [])

    const {
        showGasLevels,
        defaultNetworkLogo,
        nativeCurrency: {
            decimals: nativeCurrencyDecimals,
            logo: nativeCurrencyLogo,
        },
    } = useSelectedNetwork()

    const [transactionSpeeds, setTransactionSpeeds] =
        useState<TransactionSpeed>(getTransactionSpeeds(gasPricesLevels))

    const [speeds, setTransactionSpeedOptions] = useState<
        TransactionSpeedOption[]
    >([])

    const getSpeedOption = (
        label: string,
        price: BigNumber,
        limit: BigNumber
    ): TransactionSpeedOption => {
        return {
            label,
            gasPrice: BigNumber.from(price),
            gasLimit: BigNumber.from(limit),
            ethTotalCost: formatRounded(
                formatUnits(BigNumber.from(price).mul(BigNumber.from(limit))),
                10
            ),
            nativeCurrencyAmount: formatCurrency(
                toCurrencyAmount(
                    BigNumber.from(price).mul(BigNumber.from(limit)),
                    exchangeRates[networkNativeCurrency.symbol],
                    nativeCurrencyDecimals
                ),
                {
                    currency: nativeCurrency,
                    locale_info: localeInfo,
                    showSymbol: false,
                }
            ),
        }
    }

    const [selectedGasPrice, setSelectedGasPrice] =
        useState<TransactionSpeedOption>()

    const [userChanged, setUserChanged] = useState<boolean>(false)

    const [tab, setTab] = useState(
        tabs[!showGasLevels || !defaultLevel ? 1 : 0]
    )
    const TabComponent = tab.component
    useEffect(() => {
        if (isParentLoading) {
            if (isLoaded) setIsLoaded(false)

            return
        }

        setTransactionSpeeds(getTransactionSpeeds(gasPricesLevels))

        let speedOptions: TransactionSpeedOption[] = []
        for (let speed in transactionSpeeds) {
            speedOptions.push(
                getSpeedOption(speed, transactionSpeeds[speed], defaultGasLimit)
            )
        }

        setTransactionSpeedOptions(speedOptions)

        if (!isLoaded) {
            if (showGasLevels && defaultLevel) {
                const defaultOption = speedOptions.find(
                    (o) => o.label === defaultLevel
                )!
                setSelectedGasPrice(defaultOption)
                setGasPriceAndLimit(
                    defaultOption.gasPrice,
                    defaultOption.gasLimit
                )
                setTab(tabs[0])
            } else {
                setSelectedGasPrice(
                    getSpeedOption("Custom", defaultGasPrice, defaultGasLimit)
                )
                setGasPriceAndLimit(defaultGasPrice, defaultGasLimit)
                setTab(tabs[1])
            }
            setIsLoaded(true)
        } else {
            if (
                Object.keys(transactionSpeeds).includes(selectedGasPrice!.label)
            ) {
                const selected = speeds.find(
                    (s) => s.label === selectedGasPrice!.label
                )
                selected && handlePriceSelection(selected)
            }

            if (!showGasLevels && !userChanged) {
                setSelectedGasPrice(
                    getSpeedOption("Custom", defaultGasPrice, defaultGasLimit)
                )
                setGasPriceAndLimit(defaultGasPrice, defaultGasLimit)
            }
        }
    }, [gasPricesLevels, defaultGasPrice, defaultGasLimit, isParentLoading])

    const handlePriceSelection = (price: TransactionSpeedOption) => {
        setSelectedGasPrice(price)
        setGasPriceAndLimit(price.gasPrice, price.gasLimit)
    }

    useEffect(() => {
        if (props.showEstimationError && !showEstimationWarning) {
            setShowEstimationWarning(true)
        }
    }, [props.showEstimationError])

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
                <div className="flex justify-between w-full items-center">
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {isParentLoading || !isLoaded
                                ? "Loading prices..."
                                : capitalize(selectedGasPrice!.label)}
                        </div>
                        <div className="flex flex-row items-center justify-start mt-2 space-x-4 text-sm">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                                {!isParentLoading && isLoaded
                                    ? selectedGasPrice!.nativeCurrencyAmount
                                    : ""}
                            </span>
                            <div className="flex flex-row space-x-2 items-center">
                                {!isParentLoading && isLoaded && (
                                    <>
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
                                            {selectedGasPrice!.ethTotalCost}
                                        </span>
                                    </>
                                )}
                            </div>
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
                                content={
                                    <div className="flex flex-col font-normal items-start text-xs text-white space-y-1">
                                        <span>Gas is used to operate on the network.</span>
                                        <span>Click on this icon to learn more.</span>
                                    </div>
                                }
                            />
                        </div>
                    </div>

                    {showGasLevels && (
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
                    )}

                    <div className="flex-1 overflow-hidden">
                        <TabComponent
                            nativeCurrencyLogo={
                                nativeCurrencyLogo ?? defaultNetworkLogo
                            }
                            symbol={networkNativeCurrency.symbol}
                            options={speeds}
                            selectedGasPrice={selectedGasPrice!}
                            getSpeedOption={getSpeedOption}
                            defaultGasLimit={defaultGasLimit}
                            defaultGasPrice={defaultGasPrice}
                            setUserChanged={setUserChanged}
                            handlePriceSelection={(
                                option: TransactionSpeedOption
                            ) => {
                                handlePriceSelection(option)
                                setActive(false)
                                setShowEstimationWarning(false)
                            }}
                        />
                    </div>
                </div>
            </Dialog>
        </>
    )
}
