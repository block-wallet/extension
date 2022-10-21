import { IChain } from "@block-wallet/background/utils/types/chain"
import { Dispatch, FC, SetStateAction } from "react"
import { number } from "yup/lib/locale"
import DropdownNetworkDisplay from "./DropdownNetworkDisplay"

interface NetworkSelectorListProps {
    onAssetClick: (
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
    onAssetClick,
}) => {
    return (
        <>
            <input
                readOnly
                name="network"
                className="hidden"
                value={selectedNetwork}
            />
            {Object.values(networks).map((network, index) => {
                return (
                    <DropdownNetworkDisplay
                        key={index.toString()}
                        network={network}
                        active={selectedNetwork === network.id}
                        onClick={() => onAssetClick(network, setActive)}
                    />
                )
            })}
        </>
    )
}

export default NetworkSelectorList
