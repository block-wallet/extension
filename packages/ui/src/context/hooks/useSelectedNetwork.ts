import { useBlankState } from "../background/backgroundHooks"
import ETH_LOGO from "../../assets/images/icons/ETH.svg"
import { isFeatureEnabled } from "../util/isFeatureEnabled"

export const useSelectedNetwork = () => {
    const {
        availableNetworks,
        selectedNetwork,
        isEIP1559Compatible,
        isUserNetworkOnline,
    } = useBlankState()!

    const network = availableNetworks[selectedNetwork.toUpperCase()]
    const defaultNetworkLogo = network.iconUrls ? network.iconUrls[0] : ETH_LOGO
    return {
        ...network,
        defaultNetworkLogo,
        isEIP1559Compatible: isEIP1559Compatible[network.chainId] || false,
        isSendEnabled:
            isFeatureEnabled(network, "sends") && isUserNetworkOnline,
        isTornadoEnabled: isFeatureEnabled(network, "tornado"),
        isSwapEnabled: isFeatureEnabled(network, "swaps"),
    }
}
