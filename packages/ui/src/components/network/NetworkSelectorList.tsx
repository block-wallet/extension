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
        <>
            <span className="text-xxs text-primary-grey-dark p-3">
                {networks.length} available networks
            </span>
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
        </>
    )
}

export default NetworkSelectorList
