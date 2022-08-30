import DropDownSelector from "../input/DropDownSelector"
import DropdownNetworkDisplay from "./DropdownNetworkDisplay"
import NetworkDisplay from "./NetworkDisplay"
import { Dispatch, FunctionComponent, SetStateAction } from "react"
import { IChain } from "@block-wallet/background/utils/types/chain"

interface NetworkSelectorProps {
    networkList: IChain[]
    onNetworkChange: (network: IChain | undefined) => void
    selectedNetwork?: IChain
    error?: string
    topMargin?: number
    bottomMargin?: number
    popupMargin?: number
}

export const NetworkSelector: FunctionComponent<NetworkSelectorProps> = ({
    networkList,
    onNetworkChange,
    selectedNetwork,
    error,
    topMargin = 0,
    bottomMargin = 0,
    popupMargin = 16,
}) => {
    const onAssetClick = async (
        network: IChain,
        setActive?: Dispatch<SetStateAction<boolean>>
    ) => {
        onNetworkChange(network)
        setActive && setActive(false)
    }

    if (selectedNetwork) {
        const isAvailable = networkList.filter(
            (network) => network.id === selectedNetwork.id
        )

        if (!isAvailable.length) {
            onNetworkChange(undefined)
        }
    }

    // List
    const AssetList = ({
        setActive,
    }: {
        setActive?: Dispatch<SetStateAction<boolean>>
    }) => {
        return (
            <>
                <input
                    readOnly
                    name="network"
                    className="hidden"
                    value={selectedNetwork?.id}
                />
                {Object.values(networkList).map((network, index) => {
                    return (
                        <DropdownNetworkDisplay
                            key={index.toString()}
                            network={network}
                            active={selectedNetwork?.id === network.id}
                            onClick={() => onAssetClick(network, setActive)}
                        />
                    )
                })}
            </>
        )
    }

    const dropdownDisplay = selectedNetwork ? (
        <NetworkDisplay
            network={selectedNetwork}
            padding={false}
            transparent={true}
            bigLogo={true}
        />
    ) : networkList.length ? (
        <div className="flex flex-col justify-center w-full">
            <div className="text-base font-semibold">Select...</div>
        </div>
    ) : (
        <div className="flex flex-col justify-center w-full">
            <div className="text-base font-semibold">No available networks</div>
        </div>
    )

    return (
        <DropDownSelector
            display={dropdownDisplay}
            error={error}
            topMargin={topMargin}
            bottomMargin={bottomMargin}
            popupMargin={popupMargin}
            disabled={!networkList.length}
        >
            <AssetList />
        </DropDownSelector>
    )
}
