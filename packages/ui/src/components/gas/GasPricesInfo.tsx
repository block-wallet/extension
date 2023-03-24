import { FC, useState } from "react"
import { BigNumber } from "@ethersproject/bignumber"
import classnames from "classnames"
import { GasPriceLevels } from "@block-wallet/background/controllers/GasPricesController"
import Dialog from "../dialog/Dialog"

import AnimatedIcon, { AnimatedIconName } from "../AnimatedIcon"

// icons
import CloseIcon from "../icons/CloseIcon"
import GasIcon from "../icons/GasIcon"
import Tooltip from "../label/Tooltip"
import { AiFillInfoCircle } from "react-icons/ai"

// hooks
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
        <div className="flex flex-col p-3 space-y-1">
            <ul className="list-none">{children}</ul>
        </div>
    )
}

const GasDataInfo: FC<{ label: string; value: string }> = ({
    label,
    value,
}) => {
    return (
        <li className="flex flex-row space-x-2 justify-between space-y-1">
            <span className="font-semibold text-xs">{label}:</span>
            <span className="text-xs text-primary-grey-dark">{value}</span>
        </li>
    )
}

const INFO_BY_LEVEL = {
    slow: {
        icon: scooter,
        title: "Low",
        color: "text-green-500",
    },
    average: {
        icon: car,
        title: "Medium",
        color: "text-yellow-500",
    },
    fast: {
        icon: plane,
        title: "Fast",
        color: "text-red-600",
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
        isRatesChangingAfterNetworkChange,
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

    const isLoading =
        isNetworkChanging ||
        isRatesChangingAfterNetworkChange ||
        !displayGasPrices

    return (
        <>
            {/* Label */}
            <div
                className={`flex flex-row items-center space-x-1 ${
                    showGasLevels
                        ? "transition duration-300 hover:text-primary-blue-default  cursor-pointer"
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
                    <span className="text-sm font-semibold">
                        {displayGasPrices.average.totalGwei}
                    </span>
                )}
                <GasIcon />
            </div>

            {/* Modal */}
            <div style={undefined}>
                <Dialog open={active} onClickOutside={() => setActive(false)}>
                    <span className="absolute top-0 right-0 p-4 z-50">
                        <div
                            onClick={() => setActive(false)}
                            className=" cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                        >
                            <CloseIcon size="10" />
                        </div>
                    </span>
                    <div className="flex flex-col w-full space-y-2">
                        <div className="z-10 flex flex-row items-center p-2 bg-white bg-opacity-75">
                            <h2 className="px-2 pr-0 text-lg font-semibold">
                                Gas Prices
                            </h2>
                            <div className="group relative">
                                <a
                                    href="https://ethereum.org/en/developers/docs/gas/"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <AiFillInfoCircle
                                        size={26}
                                        className="pl-2 text-primary-grey-dark cursor-pointer hover:text-primary-blue-default"
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
                        <div>
                            <div className="flex flex-col px-4 space-y-4">
                                {displayGasPrices &&
                                    Object.entries(displayGasPrices).map(
                                        ([level, gasPriceData]) => {
                                            const info =
                                                INFO_BY_LEVEL[
                                                    level as keyof DisplayGasPricesLevels
                                                ]
                                            return (
                                                <div
                                                    className="flex flex-col border border-primary-grey-hover rounded-lg space-y-1"
                                                    key={level}
                                                >
                                                    <div
                                                        className={classnames(
                                                            "flex flex-row  items-center space-x-1 p-3",
                                                            isEIP1559Compatible &&
                                                                "border-b border-primary-grey-hover"
                                                        )}
                                                    >
                                                        <img
                                                            src={info.icon}
                                                            alt={`gas-prices-${info.title}`}
                                                            className="mr-1"
                                                        />
                                                        <span className="font-semibold text-xs">
                                                            {info.title} /
                                                        </span>
                                                        <span
                                                            className={classnames(
                                                                "font-semibold text-xs ml-6 flex-1"
                                                            )}
                                                        >
                                                            {
                                                                gasPriceData.totalGwei
                                                            }{" "}
                                                            GWEI
                                                        </span>
                                                        <span className="text-primary-grey-dark text-xs">
                                                            ~
                                                            {gasPriceToNativeCurrency(
                                                                gasPriceData.totalTransactionCost,
                                                                {
                                                                    exchangeRates,
                                                                    localeInfo:
                                                                        {
                                                                            currency:
                                                                                nativeCurrency,
                                                                            language:
                                                                                localeInfo,
                                                                        },
                                                                    minValue: 0.01,
                                                                    networkNativeCurrency:
                                                                        {
                                                                            symbol: networkNativeCurrency.symbol,
                                                                            decimals:
                                                                                nativeCurrencyDecimals,
                                                                        },
                                                                }
                                                            )}
                                                        </span>
                                                    </div>
                                                    {isEIP1559Compatible && (
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
                                                    )}
                                                </div>
                                            )
                                        }
                                    )}
                            </div>
                        </div>
                    </div>
                </Dialog>
            </div>
        </>
    )
}

export default GasPricesInfo
