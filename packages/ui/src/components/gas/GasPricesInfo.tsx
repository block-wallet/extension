import { FC, useState } from "react"
import { BigNumber } from "ethers"
import classnames from "classnames"
import { GasPriceLevels } from "@block-wallet/background/controllers/GasPricesController"
import Dialog from "../dialog/Dialog"

// icons
import CloseIcon from "../icons/CloseIcon"
import GasIcon from "../icons/GasIcon"
import Tooltip from "../label/Tooltip"
import { AiFillInfoCircle } from "react-icons/ai"

// hooks
import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import {
    calculateTransactionGas,
    gasPriceToNativeCurrency,
    gasToGweiString,
} from "../../util/gasPrice"
import { useBlankState } from "../../context/background/backgroundHooks"
import { FeeData } from "@ethersproject/abstract-provider"
import {
    DEPOSIT_GAS_COST,
    SEND_GAS_COST,
    WITHDRAW_GAS_COST,
} from "../../util/constants"
import Select from "../input/Select"
import car from "../../assets/images/icons/car.svg"
import scooter from "../../assets/images/icons/scooter.svg"
import plane from "../../assets/images/icons/plane.svg"

type DisplayGasPricesData = {
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
                let data = {}
                if (isEIP1559Compatible && estimatedBaseFee) {
                    const baseFee = BigNumber.from(estimatedBaseFee)
                    const priority = BigNumber.from(
                        gasPrice?.maxPriorityFeePerGas ?? 0
                    )
                    const baseFeePlusTip = baseFee.add(priority)
                    data = {
                        baseFee: gasToGweiString(baseFee),
                        priority: gasToGweiString(priority),
                        totalGwei: gasToGweiString(
                            BigNumber.from(baseFeePlusTip)
                        ),
                        totalTransactionCost: calculateTransactionGas(
                            gasLimit,
                            BigNumber.from(baseFeePlusTip)
                        ),
                    }
                } else {
                    data = {
                        totalGwei: gasToGweiString(gasPrice?.gasPrice),
                        totalTransactionCost: calculateTransactionGas(
                            gasLimit,
                            BigNumber.from(gasPrice?.gasPrice ?? 1)
                        ),
                    }
                }
                return {
                    ...acc,
                    [level]: data,
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
            <span className="text-xs text-gray-500">{value}</span>
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
    const [calculateGasCost, setCalculateCost] = useState<
        "SEND" | "DEPOSIT" | "WITHDRAW"
    >("SEND")
    const { exchangeRates, nativeCurrency, localeInfo, networkNativeCurrency } =
        useBlankState()!

    const {
        showGasLevels,
        isEIP1559Compatible,
        nativeCurrency: { decimals: nativeCurrencyDecimals },
        isTornadoEnabled,
    } = useSelectedNetwork()
    const { gasPricesLevels, estimatedBaseFee } = useGasPriceData()

    const GAS_LIMITS = {
        SEND: SEND_GAS_COST,
        DEPOSIT: DEPOSIT_GAS_COST,
        WITHDRAW: WITHDRAW_GAS_COST,
    }
    const displayGasPrices = getDisplayGasPrices(
        !!isEIP1559Compatible,
        gasPricesLevels,
        estimatedBaseFee!,
        GAS_LIMITS[calculateGasCost]
    )

    if (!displayGasPrices) return null

    return (
        <>
            {/* Label */}
            <div
                className={`flex flex-row items-center space-x-1 ${
                    showGasLevels
                        ? "transition duration-300 hover:text-primary-300  cursor-pointer"
                        : ""
                }`}
                onClick={() => {
                    if (showGasLevels) setActive(!active)
                }}
            >
                <span className="text-sm font-bold">
                    {displayGasPrices.average.totalGwei}
                </span>
                <GasIcon />
            </div>

            {/* Modal */}
            <div style={undefined}>
                <Dialog open={active} onClickOutside={() => setActive(false)}>
                    <span className="absolute top-0 right-0 p-4 z-50">
                        <div
                            onClick={() => setActive(false)}
                            className=" cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
                        >
                            <CloseIcon size="10" />
                        </div>
                    </span>
                    <div className="flex flex-col w-full space-y-2">
                        <div className="z-10 flex flex-row items-center p-2 bg-white bg-opacity-75">
                            <h2 className="px-2 pr-0 text-lg font-bold">
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
                        <div>
                            {/**Show the dropdown when tornado is enabled for the netowrk */}
                            {/**If we add other options like swap/bridge, we will have to rethink this logic and maybe hide options instad of the whole dropdown */}
                            {isTornadoEnabled && (
                                <div className="pb-4 pl-4 flex flex-row items-center font-semibold">
                                    Estimate costs for a
                                    <Select
                                        currentValue={calculateGasCost}
                                        type="text"
                                        onChange={setCalculateCost}
                                    >
                                        <Select.Option value="SEND">
                                            send
                                        </Select.Option>
                                        <Select.Option value="DEPOSIT">
                                            deposit
                                        </Select.Option>
                                        <Select.Option value="WITHDRAW">
                                            withdraw
                                        </Select.Option>
                                    </Select>
                                    {calculateGasCost === "WITHDRAW" && (
                                        <div className="group relative">
                                            <div className="mb-0.5">
                                                <AiFillInfoCircle
                                                    size={18}
                                                    className="text-primary-200 cursor-pointer hover:text-primary-300"
                                                />
                                            </div>
                                            <Tooltip
                                                className="!w-40 !break-word !whitespace-normal !translate-y-16 !-translate-x-24"
                                                content={
                                                    <div>
                                                        <span className="font-normal">
                                                            Low and Medium
                                                            levels are not
                                                            available for
                                                            Withdrawals.
                                                        </span>
                                                    </div>
                                                }
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="flex flex-col px-4 space-y-4">
                                {Object.entries(displayGasPrices).map(
                                    ([level, gasPriceData]) => {
                                        const info =
                                            INFO_BY_LEVEL[
                                                level as keyof DisplayGasPricesLevels
                                            ]
                                        return (
                                            <div
                                                className="flex flex-col border border-gray-200 rounded-lg space-y-1"
                                                key={level}
                                            >
                                                <div
                                                    className={classnames(
                                                        "flex flex-row  items-center space-x-1 p-3",
                                                        isEIP1559Compatible &&
                                                            "border-b border-gray-200"
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
                                                        {gasPriceData.totalGwei}{" "}
                                                        GWEI
                                                    </span>
                                                    <span className="text-gray-500 text-xs">
                                                        ~
                                                        {gasPriceToNativeCurrency(
                                                            gasPriceData.totalTransactionCost,
                                                            {
                                                                exchangeRates,
                                                                localeInfo: {
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
