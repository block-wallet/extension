import NetworkDisplay from "./NetworkDisplay"
import Spinner from "../spinner/Spinner"
import { IChain } from "@block-wallet/background/utils/types/chain"
import { FC } from "react"
import classnames from "classnames"

interface NetworkDropdownDisplay {
    isLoading: boolean
    isEmpty: boolean
    selectedNetwork?: IChain
    loadingText?: string
    emptyText?: string
}

const NetworkDropdownDisplay: FC<NetworkDropdownDisplay> = ({
    isLoading,
    isEmpty,
    selectedNetwork,
    loadingText = "",
    emptyText = "No available networks",
}) => {
    if (isLoading) {
        return (
            <div
                className={classnames(
                    "flex items-center w-full text-base font-semibold space-x-2",
                    !loadingText && "justify-center"
                )}
            >
                <Spinner size="24" />
                <span>{loadingText}</span>
            </div>
        )
    }

    if (isEmpty) {
        return <div className="text-base font-semibold">{emptyText}</div>
    }

    return selectedNetwork ? (
        <NetworkDisplay
            network={selectedNetwork}
            padding={false}
            transparent={true}
            bigLogo={false}
        />
    ) : (
        <div className="text-base font-semibold">Select network</div>
    )
}

export default NetworkDropdownDisplay
