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

// Components
import HorizontalSelect from "../input/HorizontalSelect"
import Tooltip from "../../components/label/Tooltip"
import Spinner from "../spinner/Spinner"
import Dialog from "../dialog/Dialog"
import { ArrowUpDown } from "../icons/ArrowUpDown"
import EndLabel from "../input/EndLabel"
import WarningDialog from "../dialog/WarningDialog"

// Assets
import { Classes } from "../../styles/classes"
import CloseIcon from "../icons/CloseIcon"

// Utils
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

// Context
import { useBlankState } from "../../context/background/backgroundHooks"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useGasPriceData } from "../../context/hooks/useGasPriceData"

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
    defaultNetworkLogo: string
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

// Schema
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

    // State
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
        // Clean warnings
        setGasLimitWarning("")
        setGasPriceWarning("")

        // Validations
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

    return (
        <>
            {/* ADVANCED */}
            <div className="flex flex-col w-full">
                <div className="flex flex-col w-full space-y-3 px-3 pb-3">
                    <div className="flex flex-col">
                        <label
                            className={classnames(
                                "leading-loose text-xs font-medium  mb-1",
                                !isCustom && "text-gray-400"
                            )}
                        >
                            Gas Price
                        </label>
                        <EndLabel label="GWEI">
                            <input
                                {...register("gasPrice")}
                                autoComplete="off"
                                className={classnames(
                                    Classes.inputBordered,
                                    "w-full",
                                    !isCustom && "text-gray-400",
                                    errors.gasPrice
                                        ? "border-red-400 focus:border-red-600"
                                        : gasPriceWarning
                                        ? "border-yellow-400 focus:border-yellow-600"
                                        : ""
                                )}
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
                        {/* ERROR */}
                        <span
                            className={classnames(
                                "text-xs",
                                errors.gasPrice
                                    ? "text-red-500"
                                    : gasPriceWarning
                                    ? "text-yellow-500"
                                    : "m-0 h-0"
                            )}
                        >
                            {errors.gasPrice?.message || gasPriceWarning || ""}
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <label
                            className={classnames(
                                "leading-loose text-xs font-medium  mb-1",
                                !isCustom && "text-gray-400"
                            )}
                        >
                            Gas limit
                        </label>
                        <EndLabel label="WEI">
                            <input
                                autoComplete="off"
                                {...register("gasLimit")}
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
                </div>
                <div>
                    <hr className="absolute left-0 border-0.5 border-gray-200 w-full" />
                    <div className="flex flex-row w-full items-center pt-5 justify-between space-x-4 mt-auto px-4">
                        <button
                            type="button"
                            className={classnames(Classes.button)}
                            onClick={handleSave}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

const GasSelectorBasic = (props: GasTabProps) => {
    const {
        options,
        selectedGasPrice,
        handlePriceSelection,
        defaultNetworkLogo,
        symbol,
    } = props
    return (
        <>
            {/* REGULAR */}
            {options.map((price: TransactionSpeedOption, i) => {
                return (
                    <div
                        className="w-full flex flex-row items-center justify-content-between cursor-pointer rounded-md hover:bg-gray-100 px-2"
                        key={i}
                        onClick={() => {
                            handlePriceSelection(price)
                        }}
                    >
                        <div className="flex flex-col flex-grow items-start px-2 py-1 w-11/12">
                            <label
                                className={classnames(
                                    "text-base font-semibold mb-2 cursor-pointer capitalize",
                                    selectedGasPrice.label === price.label &&
                                        "text-primary-300"
                                )}
                            >
                                {price.label}
                            </label>
                            <div className="flex flex-row w-full items-center justify-start">
                                <div className="w-36">
                                    <span
                                        className={classnames(
                                            "text-sm",
                                            selectedGasPrice.label ===
                                                price.label &&
                                                "text-primary-300"
                                        )}
                                    >
                                        {price.nativeCurrencyAmount}
                                    </span>
                                </div>
                                <div className="flex flex-row space-x-2 items-center justify-start w-44">
                                    <div className="justify-self-start">
                                        <img
                                            src={defaultNetworkLogo}
                                            alt={symbol}
                                            width="20px"
                                            draggable={false}
                                        />
                                    </div>
                                    <div className="w-full">
                                        <span
                                            className={classnames(
                                                "text-sm",
                                                selectedGasPrice.label ===
                                                    price.label &&
                                                    "text-primary-300"
                                            )}
                                        >
                                            {price.ethTotalCost}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex w-1/12">
                            <ImCheckmark
                                className={classnames(
                                    "text-sm",
                                    selectedGasPrice.label === price.label
                                        ? "text-primary-300"
                                        : "hidden"
                                )}
                            />
                        </div>
                    </div>
                )
            })}
        </>
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
    // Popup variables
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

    // State variables
    const { nativeCurrency, localeInfo, exchangeRates, networkNativeCurrency } =
        useBlankState()!

    const { gasPricesLevels } = useGasPriceData()

    const {
        showGasLevels,
        defaultNetworkLogo,
        nativeCurrency: { decimals: nativeCurrencyDecimals },
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
                    showSymbol: true,
                }
            ),
        }
    }

    const [selectedGasPrice, setSelectedGasPrice] =
        useState<TransactionSpeedOption>()

    const [userChanged, setUserChanged] = useState<boolean>(false)

    // Tabs variables
    // if network is configured to noxt show gas levels or received gas does not match with average, default is advanced tab.
    const [tab, setTab] = useState(
        tabs[!showGasLevels || !defaultLevel ? 1 : 0]
    )
    const TabComponent = tab.component
    //Recalculate options on gas change
    useEffect(() => {
        // Waits till parent component finishes loading (estimation and transaction values)
        if (isParentLoading) {
            // This means there was a change on parent component that is updating values so we should reload all values.
            if (isLoaded) setIsLoaded(false)

            // keeps waiting for parent to finish
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

        //Default selected checks if received default price is equals average to select it, otherwise sets custom value.
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gasPricesLevels, defaultGasPrice, defaultGasLimit, isParentLoading])

    // Handlers
    const handlePriceSelection = (price: TransactionSpeedOption) => {
        setSelectedGasPrice(price)
        setGasPriceAndLimit(price.gasPrice, price.gasLimit)
    }

    // Effect to check if estimation failed when switching to a new tx
    useEffect(() => {
        if (props.showEstimationError && !showEstimationWarning) {
            setShowEstimationWarning(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.showEstimationError])

    return (
        <>
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
                <div className="flex justify-start w-full space-x-2">
                    <div className={"text-xs font-semibold"}>
                        {isParentLoading || !isLoaded
                            ? "Loading prices..."
                            : capitalize(selectedGasPrice!.label)}
                    </div>
                    <div className="flex flex-row w-full items-center justify-start space-x-3 text-xs">
                        <span className="text-xs text-gray-600">
                            {!isParentLoading && isLoaded
                                ? selectedGasPrice!.nativeCurrencyAmount
                                : ""}
                        </span>
                        <div className="flex flex-row space-x-1 items-center justify-self-end">
                            {!isParentLoading && isLoaded && (
                                <>
                                    <div className="justify-self-start">
                                        <img
                                            src={defaultNetworkLogo}
                                            alt={networkNativeCurrency.symbol}
                                            width="20px"
                                            draggable={false}
                                        />
                                    </div>
                                    <div className="w-full">
                                        <span className="text-xs">
                                            {selectedGasPrice!.ethTotalCost}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
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
                            <h2 className="pl-0.5 pr-0 text-lg font-bold">
                                Gas Price
                            </h2>
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

                        {showGasLevels && (
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
                        )}

                        <TabComponent
                            defaultNetworkLogo={defaultNetworkLogo}
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
