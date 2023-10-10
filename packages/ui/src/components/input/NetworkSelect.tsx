import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react"
import { RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri"
import { BsCheck } from "react-icons/bs"
import { useHistory } from "react-router-dom"

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

    return (
        <li
            title={option.desc}
            className={classnames(
                "cursor-pointer flex flex-row pr-2 pt-1 pb-1 items-center hover:bg-gray-100",
                !option.enable && "bg-gray-200 pointer-events-none",
                disabled && "opacity-50 pointer-events-none",
                option.name === selectedNetwork && "pointer-events-none"
            )}
            onClick={async () => await handleNetworkChange(option.name)}
        >
            {!hasImageError && option.iconUrls && option.iconUrls.length > 0 ? (
                <img
                    src={option.iconUrls[0]}
                    alt="network icon"
                    className="w-4 h-4 mx-2"
                    onError={() => {
                        setHasImageError(true)
                    }}
                />
            ) : (
                <span
                    className={"h-2 w-2 rounded-xl mx-3"}
                    style={{ backgroundColor: networkColor }}
                />
            )}

            <span
                className={classnames(
                    "leading-loose text-ellipsis overflow-hidden whitespace-nowrap",
                    selectedNetwork === option.name && "font-semibold"
                )}
            >
                {option.desc}
            </span>
            {selectedNetwork === option.name && <BsCheck size={16} />}
        </li>
    )
}

const NetworkSelect: FunctionComponent<{
    className?: string
    optionsContainerClassName?: string
}> = ({ className, optionsContainerClassName }) => {
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
                    "relative flex flex-row items-center justify-start p-1 text-primary-black-default bg-primary-grey-default rounded group border-primary-200 w-[155px] text-xs hover:bg-primary-grey-hover",
                    !isImportingDeposits
                        ? "cursor-pointer select-none"
                        : "disabled:pointer-events-none opacity-50",
                    networkList && "border-primary-blue-default"
                )}
            >
                {!hasImageError &&
                networkData.iconUrls &&
                networkData.iconUrls.length > 0 ? (
                    <img
                        src={networkData.iconUrls[0]}
                        alt="network icon"
                        className="w-4 h-4 mr-2 ml-1"
                    />
                ) : (
                    <span
                        className={"justify-start h-2 rounded-xl ml-2 mr-2"}
                        style={{
                            backgroundColor: networkColor,
                            width: "9px",
                        }}
                    />
                )}
                <span
                    data-testid="selected-network"
                    className="justify-start select-none w-36 text-ellipsis overflow-hidden whitespace-nowrap"
                >
                    {networkData.desc}
                </span>
                {networkList ? (
                    <RiArrowUpSLine size={16} className="w-5" />
                ) : (
                    <RiArrowDownSLine size={16} className="w-5" />
                )}
            </div>

            <div
                hidden={!networkList}
                className={`absolute shadow-md rounded-md w-44 max-h-96 overflow-y-auto mt-2 bg-white z-50 select-none ${optionsContainerClassName}`}
            >
                <ul className="text-xs">
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
                    <li
                        key="test"
                        className="cursor-pointer flex flex-row justify-between pl-2 pr-2 pt-1 pb-1 items-center border-t border-t-gray-200 border-b border-b-gray-200 hover:bg-gray-100"
                        onClick={() => setShowTestNetworks(!showTestNetworks)}
                    >
                        <label
                            className="leading-loose text-primary-grey-dark cursor-pointer"
                            htmlFor="showTestNetworks"
                        >
                            Show Test Networks
                        </label>
                        <input
                            id="showTestNetworks"
                            type="checkbox"
                            className="border-2 border-primary-grey-hover rounded-md focus:ring-0 cursor-pointer"
                            checked={showTestNetworks}
                            onChange={() => {}}
                        />
                    </li>
                    {showTestNetworks &&
                        Object.values(availableNetworks)
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
                    <li
                        className={`${
                            showTestNetworks
                                ? "border-t border-t-gray-200 border-b border-b-gray-200"
                                : ""
                        } hover:bg-gray-100`}
                    >
                        <ClickableText
                            className={`cursor-pointer flex flex-row justify-between pl-2 pr-2 pt-1 pb-1 leading-loose items-center w-full rounded-none`}
                            onClick={() =>
                                history.push({
                                    pathname: "/settings/networks",
                                    state: { isFromHomePage: true },
                                })
                            }
                        >
                            Edit Networks
                        </ClickableText>
                    </li>
                </ul>
            </div>
        </div>
    )
}

export default NetworkSelect
