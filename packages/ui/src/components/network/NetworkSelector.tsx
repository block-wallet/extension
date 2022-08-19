import DropDownSelector from "../input/DropDownSelector"
import NetworkDisplay from "./DropdownNetworkDisplay"
import { Dispatch, FC, SetStateAction } from "react"
import NetworkLogo from "./NetworkLogo"
import { IChain } from "@block-wallet/background/utils/types/chain"

interface NetworkSelectorProps {
    networkList: IChain[]
    onNetworkChange: (network: IChain) => void
    selectedNetwork?: IChain
    error?: string
    topMargin?: number
    bottomMargin?: number
    popupMargin?: number
}

export const NetworkSelector: FC<NetworkSelectorProps> = ({
    networkList,
    onNetworkChange,
    selectedNetwork,
    error,
    topMargin,
    bottomMargin,
    popupMargin,
}) => {
    const onAssetClick = async (
        network: IChain,
        setActive?: Dispatch<SetStateAction<boolean>>
    ) => {
        onNetworkChange(network)
        setActive && setActive(false)
    }

    // List
    const AssetList = ({
        setActive,
    }: {
        setActive?: Dispatch<SetStateAction<boolean>>
    }) => {
        return (
            <div className="pb-6">
                <input
                    readOnly
                    name="network"
                    className="hidden"
                    value={selectedNetwork?.id}
                />
                {Object.values(networkList).map((network, index) => {
                    return (
                        <div
                            className="cursor-pointer"
                            key={index.toString()}
                            onClick={() => onAssetClick(network, setActive)}
                        >
                            <NetworkDisplay
                                network={network}
                                active={selectedNetwork?.id === network.id}
                            />
                        </div>
                    )
                })}
            </div>
        )
    }

    const dropdownDisplay = selectedNetwork ? (
        <div className="flex flex-row flex-grow justify-between items-center">
            <div className="flex items-center justify-center w-6 h-6 rounded-full mr-2">
                <NetworkLogo
                    iconUrl={selectedNetwork.logoURI}
                    name={selectedNetwork.name}
                />
            </div>
            <div className="flex flex-grow justify-between space-x-1">
                <div className="flex flex-col justify-center">
                    <span className="text-base font-semibold">
                        {selectedNetwork.name}
                    </span>
                </div>
            </div>
        </div>
    ) : (
        <div className="flex flex-col justify-center w-full">
            <div className="text-base font-semibold">Select...</div>
        </div>
    )

    return (
        <DropDownSelector
            display={dropdownDisplay}
            error={error}
            topMargin={topMargin || 0}
            bottomMargin={bottomMargin || 0}
            popupMargin={popupMargin || 16}
        >
            <AssetList />
        </DropDownSelector>
    )
}
