import { FC, useState } from "react"
import { BigNumber } from "@ethersproject/bignumber"
import classnames from "classnames"
import { GasPriceLevels } from "@block-wallet/background/controllers/GasPricesController"
import Dialog from "../dialog/Dialog"

import AnimatedIcon, { AnimatedIconName } from "../AnimatedIcon"

import CloseIcon from "../icons/CloseIcon"
import GasIcon from "../icons/GasIcon"
import Tooltip from "../label/Tooltip"
import { AiFillInfoCircle } from "react-icons/ai"

import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import {
    gasPriceToNativeCurrency,
    getTransactionFees,
} from "../../util/gasPrice"
import { useBlankState } from "../../context/background/backgroundHooks"
import { FeeData } from "@ethersproject/abstract-provider"
import { SEND_GAS_COST } from "../../util/constants"
import car from "../../assets/images/icons/car.svg"
import scooter from "../../assets/images/icons/scooter.svg"
import plane from "../../assets/images/icons/plane.svg"
import { useHotkeys } from "react-hotkeys-hook"
import { componentsHotkeys } from "../../util/hotkeys"

export type DisplayGasPricesData = {
    baseFee?: string
    priority?: string
    totalGwei: string
    totalTransactionCost: BigNumber
}

type DisplayGasPricesLevels = {
    slow: DisplayGasPricesData
    average: DisplayGasPricesData
    fast: DisplayGasPricesData
}

const defaultObj = {
    totalGwei: "",
    totalTransactionCost: BigNumber.from(0),
}

const getDisplayGasPrices = (
    isEIP1559Compatible: boolean,
    gasPrices: GasPriceLevels,
    estimatedBaseFee: BigNumber,
    gasLimit: BigNumber
): DisplayGasPricesLevels | undefined => {
    if (gasPrices) {
        return (
            Object.entries(gasPrices) as Array<[keyof GasPriceLevels, FeeData]>
        ).reduce(
            (acc: DisplayGasPricesLevels, [level, gasPrice]) => {
                return {
                    ...acc,
                    [level]: getTransactionFees(
                        isEIP1559Compatible,
                        gasPrice,
                        estimatedBaseFee,
                        gasLimit
                    ),
                }
            },
            { slow: defaultObj, average: defaultObj, fast: defaultObj }
        )
    }

    return undefined
}

const GasData = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex flex-col p-3 space-y-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <ul className="list-none space-y-1">{children}</ul>
        </div>
    )
}

const GasDataInfo: FC<{ label: string; value: string }> = ({
    label,
    value,
}) => {
    return (
        <li className="flex flex-row justify-between items-center">
            <span className="font-semibold text-xs text-gray-700 dark:text-gray-300">{label}:</span>
            <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>
        </li>
    )
}

const INFO_BY_LEVEL = {
    slow: {
        icon: scooter,
        title: "Low",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-900/20",
        borderColor: "border-green-200 dark:border-green-800/50",
    },
    average: {
        icon: car,
        title: "Medium",
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
        borderColor: "border-amber-200 dark:border-amber-800/50",
    },
    fast: {
        icon: plane,
        title: "Fast",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-900/20",
        borderColor: "border-red-200 dark:border-red-800/50",
    },
}

const GasPricesInfo: FC = () => {
    const [active, setActive] = useState(false)
    const [calculateGasCost] = useState<"SEND">("SEND")
    const {
        exchangeRates,
        nativeCurrency,
        localeInfo,
        networkNativeCurrency,
        isNetworkChanging,
        hotkeysEnabled,
    } = useBlankState()!

    const {
        showGasLevels,
        isEIP1559Compatible,
        nativeCurrency: { decimals: nativeCurrencyDecimals },
    } = useSelectedNetwork()
    const { gasPricesLevels, estimatedBaseFee } = useGasPriceData()

    const GAS_LIMITS = {
        SEND: SEND_GAS_COST,
    }
    const displayGasPrices = getDisplayGasPrices(
        !!isEIP1559Compatible,
        gasPricesLevels,
        estimatedBaseFee!,
        GAS_LIMITS[calculateGasCost]
    )

    const isLoading = isNetworkChanging || !displayGasPrices

    const gasPricesInfoHotkeys = componentsHotkeys.GasPricesInfo
    useHotkeys(gasPricesInfoHotkeys, (e) => {
        if (!hotkeysEnabled) return

        const keyPressed = e.code
            .replace(/key/i, "")
            .replace(/digit/i, "")
            .replace(/numpad/i, "")
            .toLowerCase()

        if (showGasLevels) {
            if (e.altKey && keyPressed === "g") {
                setActive(!active)
            } else if (keyPressed === "enter") {
                setActive(false)
            }
        }
    })

    return (
        <>
            <div
                className={`flex flex-row items-center space-x-1 ${showGasLevels
                    ? "transition duration-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    : ""
                    }`}
                onClick={() => {
                    if (showGasLevels) setActive(!active)
                }}
            >
                {isLoading ? (
                    <AnimatedIcon
                        icon={AnimatedIconName.GreyLineLoadingSkeleton}
                        className="h-4 w-6 rotate-180"
                        svgClassName="rounded-md"
                    />
                ) : (
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {displayGasPrices.average.totalGwei}
                    </span>
                )}
                <div className="text-gray-600 dark:text-gray-400">
                    <GasIcon />
                </div>
            </div>

            <Dialog open={active} onClickOutside={() => setActive(false)}>
                <span className="absolute top-0 right-0 p-4 z-50">
                    <div
                        onClick={() => setActive(false)}
                        className="cursor-pointer p-2 ml-auto -mr-2 text-gray-900 dark:text-gray-100 transition duration-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <CloseIcon size="10" />
                    </div>
                </span>
                <div className="flex flex-col w-full space-y-4">
                    <div className="flex flex-row items-center space-x-3 px-3">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Gas Prices
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

                    <div className="px-4 space-y-3">
                        {displayGasPrices &&
                            Object.entries(displayGasPrices).map(
                                ([level, gasPriceData]) => {
                                    const info = INFO_BY_LEVEL[level as keyof DisplayGasPricesLevels]
                                    return (
                                        <div
                                            className={`border rounded-xl transition-all duration-200 ${info.borderColor} ${info.bgColor}`}
                                            key={level}
                                        >
                                            <div className={classnames(
                                                "flex flex-row items-center justify-between p-4",
                                                isEIP1559Compatible && "border-b border-gray-200 dark:border-gray-700"
                                            )}>
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex items-center space-x-2">
                                                        <img
                                                            src={info.icon}
                                                            alt={`gas-prices-${info.title}`}
                                                            className="w-5 h-5"
                                                        />
                                                        <span className={`font-semibold text-sm ${info.color}`}>
                                                            {info.title}
                                                        </span>
                                                    </div>
                                                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                        {gasPriceData.totalGwei} GWEI
                                                    </span>
                                                </div>
                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                    ~{gasPriceToNativeCurrency(
                                                        gasPriceData.totalTransactionCost,
                                                        {
                                                            exchangeRates,
                                                            localeInfo: {
                                                                currency: nativeCurrency,
                                                                language: localeInfo,
                                                            },
                                                            minValue: 0.01,
                                                            networkNativeCurrency: {
                                                                symbol: networkNativeCurrency.symbol,
                                                                decimals: nativeCurrencyDecimals,
                                                            },
                                                        }
                                                    )}
                                                </span>
                                            </div>
                                            {isEIP1559Compatible && (
                                                <div className="p-4 pt-3">
                                                    <GasData>
                                                        <GasDataInfo
                                                            label="Base Fee"
                                                            value={`${gasPriceData.baseFee} GWEI`}
                                                        />
                                                        <GasDataInfo
                                                            label="Tip"
                                                            value={`${gasPriceData.priority} GWEI`}
                                                        />
                                                    </GasData>
                                                </div>
                                            )}
                                        </div>
                                    )
                                }
                            )}
                    </div>
                </div>
            </Dialog>
        </>
    )
}

export default GasPricesInfo
