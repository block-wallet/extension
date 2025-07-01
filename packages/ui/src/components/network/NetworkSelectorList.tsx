import { IChain } from "@block-wallet/background/utils/types/chain"
import { Dispatch, FC, SetStateAction } from "react"
import DropdownNetworkDisplay from "./DropdownNetworkDisplay"

interface NetworkSelectorListProps {
    onSelectNetwork: (
        network: IChain,
        setActive?: Dispatch<SetStateAction<boolean>>
    ) => void
    setActive?: Dispatch<SetStateAction<boolean>>
    networks: IChain[]
    selectedNetwork?: number
}

const NetworkSelectorList: FC<NetworkSelectorListProps> = ({
    setActive,
    networks,
    selectedNetwork,
    onSelectNetwork,
}) => {
    return (
        <div className="pb-2">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {networks.length} Network{networks.length !== 1 ? 's' : ''} Available
                </span>
            </div>
            <div className="px-2 pt-2 space-y-1">
                <input
                    readOnly
                    name="network"
                    className="hidden"
                    value={selectedNetwork}
                />
                {Object.values(networks).map((network) => {
                    return (
                        <DropdownNetworkDisplay
                            key={network.id}
                            network={network}
                            active={selectedNetwork === network.id}
                            onClick={() => onSelectNetwork(network, setActive)}
                        />
                    )
                })}
            </div>
        </div>
    )
}

export default NetworkSelectorList
