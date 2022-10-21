import NetworkDisplay from "./NetworkDisplay"
import Spinner from "../spinner/Spinner"
import { IChain } from "@block-wallet/background/utils/types/chain"
import { FC } from "react"

interface NetworkDropdownDisplay {
    isLoading: boolean
    isEmpty: boolean
    selectedNetwork?: IChain
}

const NetworkDropdownDisplay: FC<NetworkDropdownDisplay> = ({
    isLoading,
    isEmpty,
    selectedNetwork,
}) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center w-full">
                <Spinner size="24" />
            </div>
        )
    }

    if (isEmpty) {
        return (
            <div className="text-base font-semibold">No available networks</div>
        )
    }

    return selectedNetwork ? (
        <NetworkDisplay
            network={selectedNetwork}
            padding={false}
            transparent={true}
            bigLogo={false}
        />
    ) : (
        <div className="text-base font-semibold">Select...</div>
    )
}

export default NetworkDropdownDisplay
