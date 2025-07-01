import NetworkDisplay from "./NetworkDisplay"
import Spinner from "../spinner/Spinner"
import { IChain } from "@block-wallet/background/utils/types/chain"
import { FC } from "react"
import classnames from "classnames"

interface NetworkDropdownDisplayProps {
    isLoading: boolean
    isEmpty: boolean
    selectedNetwork?: IChain
    loadingText?: string
    emptyText?: string
}

const NetworkDropdownDisplay: FC<NetworkDropdownDisplayProps> = ({
    isLoading,
    isEmpty,
    selectedNetwork,
    loadingText = "",
    emptyText = "No available networks",
}) => {
    if (isLoading) {
        return (
            <div className="flex items-center w-full text-sm font-semibold space-x-3 text-gray-900 dark:text-white">
                <Spinner size="20" />
                <span className="text-gray-600 dark:text-gray-400">{loadingText}</span>
            </div>
        )
    }

    if (isEmpty) {
        return (
            <div className="flex items-center w-full text-sm font-semibold text-gray-500 dark:text-gray-400">
                {emptyText}
            </div>
        )
    }

    return selectedNetwork ? (
        <div className="flex items-center w-full">
            <NetworkDisplay
                network={selectedNetwork}
                padding={false}
                transparent={true}
                bigLogo={false}
                compact={true}
            />
        </div>
    ) : (
        <div className="flex items-center w-full text-sm font-semibold text-gray-500 dark:text-gray-400">
            Select network
        </div>
    )
}

export default NetworkDropdownDisplay
