import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react"
import { RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri"
import { BsCheck } from "react-icons/bs"
import { useHistory } from "react-router-dom"
import { HiCog } from "react-icons/hi"

import ClickableText from "../button/ClickableText"
import { useBlankState } from "../../context/background/backgroundHooks"
import classnames from "classnames"
import { useOnClickOutside } from "../../util/useOnClickOutside"
import { changeNetwork, setShowTestNetworks } from "../../context/commActions"
import { Network } from "@block-wallet/background/utils/constants/networks"
import classNames from "classnames"
import { sortNetworksByOrder } from "../../util/networkUtils"
import { getNetworkColor } from "../../util/getNetworkColor"

const NetworkOption: FunctionComponent<{
    option: Network
    selectedNetwork: string
    handleNetworkChange: (network: string) => void
    disabled?: boolean
}> = ({ option, selectedNetwork, handleNetworkChange, disabled = false }) => {
    const networkColor = getNetworkColor(option)
    const [hasImageError, setHasImageError] = useState(false)
    const isSelected = option.name === selectedNetwork

    return (
        <li
            title={option.desc}
            className={classnames(
                "cursor-pointer flex flex-row items-center px-3 py-2 mx-1 rounded-lg transition-all duration-200 group",
                "hover:bg-gray-100 dark:hover:bg-gray-700",
                !option.enable && "bg-gray-100 dark:bg-gray-800 opacity-50 pointer-events-none",
                disabled && "opacity-50 pointer-events-none",
                isSelected && "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 pointer-events-none"
            )}
            onClick={async () => await handleNetworkChange(option.name)}
        >
            <div className="flex items-center flex-1 min-w-0">
                {!hasImageError && option.iconUrls && option.iconUrls.length > 0 ? (
                    <div className="flex items-center justify-center w-6 h-6 mr-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <img
                            src={option.iconUrls[0]}
                            alt="network icon"
                            className="w-4 h-4 rounded-full"
                            onError={() => {
                                setHasImageError(true)
                            }}
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center w-6 h-6 mr-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: networkColor }}
                        />
                    </div>
                )}

                <span
                    className={classnames(
                        "text-sm font-medium truncate transition-colors duration-200",
                        isSelected
                            ? "text-blue-700 dark:text-blue-300 font-semibold"
                            : "text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200"
                    )}
                >
                    {option.desc}
                </span>
            </div>
            {isSelected && (
                <div className="flex items-center justify-center w-5 h-5 ml-3 flex-shrink-0">
                    <BsCheck size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
            )}
        </li>
    )
}

const NetworkSelect: FunctionComponent<{
    className?: string
    optionsContainerClassName?: string
    compact?: boolean
}> = ({ className, optionsContainerClassName, compact = false }) => {
    const history = useHistory()!
    const [networkList, setNetworkList] = useState(false)
    const [hasImageError, setHasImageError] = useState(false)

    const {
        selectedNetwork,
        availableNetworks,
        showTestNetworks,
        isImportingDeposits,
        isUserNetworkOnline,
    } = useBlankState()!
    const ref = useRef(null)
    useOnClickOutside(ref, () => setNetworkList(false))

    const handleNetworkChange = async (network: string) => {
        setNetworkList(false)
        changeNetwork(network)
    }

    const networkData = availableNetworks[selectedNetwork.toUpperCase()]

    const networkColor = useMemo(() => {
        return getNetworkColor(networkData)
    }, [networkData])

    // Check if the network icon is valid before render. if not show the colored circle
    useEffect(() => {
        if (networkData.iconUrls && networkData.iconUrls.length > 0) {
            const image = new Image()
            image.src = networkData.iconUrls[0]
            image.onerror = () => {
                setHasImageError(true)
            }
            image.onload = () => {
                setHasImageError(false)
            }
        }
    }, [networkData])

    if (compact) {
        return (
            <div
                className={`relative ${className}`}
                ref={ref}
                role="menu"
                data-testid="network-selector-compact"
            >
                <div
                    onClick={() => {
                        if (!isImportingDeposits) {
                            setNetworkList(!networkList)
                        }
                    }}
                    className={classNames(
                        "relative flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-800 rounded-full border-2 border-gray-200 dark:border-gray-700 transition-all duration-200 shadow-sm",
                        !isImportingDeposits
                            ? "cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md"
                            : "disabled:pointer-events-none opacity-50",
                        networkList && "border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 dark:ring-blue-400/20"
                    )}
                    title={`Current network: ${networkData.desc}`}
                >
                    {!hasImageError &&
                        networkData.iconUrls &&
                        networkData.iconUrls.length > 0 ? (
                        <img
                            src={networkData.iconUrls[0]}
                            alt={networkData.desc}
                            className="w-5 h-5 rounded-full"
                        />
                    ) : (
                        <div className="flex items-center justify-center w-5 h-5">
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: networkColor }}
                            />
                        </div>
                    )}
                </div>

                <div
                    hidden={!networkList}
                    className={classNames(
                        "absolute shadow-lg rounded-lg w-[260px] max-h-80 overflow-y-auto mt-2 bg-white dark:bg-gray-800 z-50 select-none border border-gray-200 dark:border-gray-700",
                        "left-1/2 transform -translate-x-1/2",
                        optionsContainerClassName
                    )}
                    style={{
                        maxWidth: 'calc(100vw - 20px)',
                        minWidth: '240px'
                    }}
                >
                    <div className="py-2">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Available Networks
                            </span>
                        </div>
                        <div className="px-2 pt-2">
                            <ul className="space-y-1">
                                {Object.values(availableNetworks)
                                    .filter((n) => n.enable && !n.test)
                                    .sort(sortNetworksByOrder)
                                    .map((option) => (
                                        <NetworkOption
                                            key={option.chainId}
                                            option={option}
                                            selectedNetwork={selectedNetwork}
                                            handleNetworkChange={handleNetworkChange}
                                            disabled={!isUserNetworkOnline}
                                        />
                                    ))}
                            </ul>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 mt-2">
                            <div
                                className="cursor-pointer flex flex-row justify-between items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                                onClick={() => setShowTestNetworks(!showTestNetworks)}
                            >
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                    Show Test Networks
                                </label>
                                <input
                                    id="showTestNetworks"
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-2 cursor-pointer"
                                    checked={showTestNetworks}
                                    onChange={() => { }}
                                />
                            </div>
                        </div>

                        {showTestNetworks && (
                            <div className="px-2 pb-2">
                                <div className="px-2 py-1">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Test Networks
                                    </span>
                                </div>
                                <ul className="space-y-1">
                                    {Object.values(availableNetworks)
                                        .filter((n) => n.enable && n.test)
                                        .sort(sortNetworksByOrder)
                                        .map((option) => (
                                            <NetworkOption
                                                key={option.chainId}
                                                option={option}
                                                selectedNetwork={selectedNetwork}
                                                handleNetworkChange={handleNetworkChange}
                                                disabled={
                                                    !isUserNetworkOnline &&
                                                    !option.name
                                                        .toLowerCase()
                                                        .includes("localhost")
                                                }
                                            />
                                        ))}
                                </ul>
                            </div>
                        )}

                        <div className="border-t border-gray-200 dark:border-gray-700">
                            <div
                                className="cursor-pointer flex flex-row items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                                onClick={() =>
                                    history.push({
                                        pathname: "/settings/networks",
                                        state: { isFromHomePage: true },
                                    })
                                }
                            >
                                <HiCog className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-3" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Edit Networks
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            className={`relative ${className}`}
            ref={ref}
            role="menu"
            data-testid="network-selector"
        >
            <div
                onClick={() => {
                    if (!isImportingDeposits) {
                        setNetworkList(!networkList)
                    }
                }}
                className={classNames(
                    "relative flex flex-row items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-[180px] text-sm font-medium transition-all duration-200",
                    !isImportingDeposits
                        ? "cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        : "disabled:pointer-events-none opacity-50",
                    networkList && "border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 dark:ring-blue-400/20",
                    "text-gray-900 dark:text-white"
                )}
            >
                <div className="flex items-center min-w-0 flex-1">
                    {!hasImageError &&
                        networkData.iconUrls &&
                        networkData.iconUrls.length > 0 ? (
                        <div className="flex items-center justify-center w-5 h-5 mr-2 bg-gray-100 dark:bg-gray-700 rounded-full flex-shrink-0">
                            <img
                                src={networkData.iconUrls[0]}
                                alt="network icon"
                                className="w-3 h-3 rounded-full"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center w-5 h-5 mr-2 bg-gray-100 dark:bg-gray-700 rounded-full flex-shrink-0">
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: networkColor }}
                            />
                        </div>
                    )}
                    <span
                        data-testid="selected-network"
                        className="truncate font-medium"
                    >
                        {networkData.desc}
                    </span>
                </div>
                <div className="flex items-center justify-center w-5 h-5 ml-2 flex-shrink-0">
                    {networkList ? (
                        <RiArrowUpSLine size={16} className="text-gray-500 dark:text-gray-400" />
                    ) : (
                        <RiArrowDownSLine size={16} className="text-gray-500 dark:text-gray-400" />
                    )}
                </div>
            </div>

            <div
                hidden={!networkList}
                className={classNames(
                    "absolute shadow-lg rounded-lg w-[260px] max-h-80 overflow-y-auto mt-2 bg-white dark:bg-gray-800 z-50 select-none border border-gray-200 dark:border-gray-700",
                    "left-1/2 transform -translate-x-1/2",
                    optionsContainerClassName
                )}
                style={{
                    maxWidth: 'calc(100vw - 20px)',
                    minWidth: '240px'
                }}
            >
                <div className="py-2">
                    <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Available Networks
                        </span>
                    </div>
                    <div className="px-2 pt-2">
                        <ul className="space-y-1">
                            {Object.values(availableNetworks)
                                .filter((n) => n.enable && !n.test)
                                .sort(sortNetworksByOrder)
                                .map((option) => (
                                    <NetworkOption
                                        key={option.chainId}
                                        option={option}
                                        selectedNetwork={selectedNetwork}
                                        handleNetworkChange={handleNetworkChange}
                                        disabled={!isUserNetworkOnline}
                                    />
                                ))}
                        </ul>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 mt-2">
                        <div
                            className="cursor-pointer flex flex-row justify-between items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                            onClick={() => setShowTestNetworks(!showTestNetworks)}
                        >
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                Show Test Networks
                            </label>
                            <input
                                id="showTestNetworks"
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-2 cursor-pointer"
                                checked={showTestNetworks}
                                onChange={() => { }}
                            />
                        </div>
                    </div>

                    {showTestNetworks && (
                        <div className="px-2 pb-2">
                            <div className="px-2 py-1">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Test Networks
                                </span>
                            </div>
                            <ul className="space-y-1">
                                {Object.values(availableNetworks)
                                    .filter((n) => n.enable && n.test)
                                    .sort(sortNetworksByOrder)
                                    .map((option) => (
                                        <NetworkOption
                                            key={option.chainId}
                                            option={option}
                                            selectedNetwork={selectedNetwork}
                                            handleNetworkChange={handleNetworkChange}
                                            disabled={
                                                !isUserNetworkOnline &&
                                                !option.name
                                                    .toLowerCase()
                                                    .includes("localhost")
                                            }
                                        />
                                    ))}
                            </ul>
                        </div>
                    )}

                    <div className="border-t border-gray-200 dark:border-gray-700">
                        <div
                            className="cursor-pointer flex flex-row items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                            onClick={() =>
                                history.push({
                                    pathname: "/settings/networks",
                                    state: { isFromHomePage: true },
                                })
                            }
                        >
                            <HiCog className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-3" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Edit Networks
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default NetworkSelect
