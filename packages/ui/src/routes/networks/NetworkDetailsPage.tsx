import { Network } from "@block-wallet/background/utils/constants/networks"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { canDeleteNetwork, getFirstUrl } from "../../util/networkUtils"
import NetworkFormPage from "./NetworkFormPage"

const NetworkDetailsPage = () => {
    const history = useOnMountHistory()
    const { network } = history.location.state as { network: Network }
    return (
        <NetworkFormPage
            editMode="minimal"
            canDelete={canDeleteNetwork(network)}
            network={{
                blockExplorerUrl: getFirstUrl(network?.blockExplorerUrls),
                rpcUrl: network?.currentRpcUrl,
                name: network?.desc!,
                chainId: network?.chainId!,
                symbol: network?.nativeCurrency.symbol!,
                isTestnet: network?.test,
                nativelySupported: network.nativelySupported,
            }}
            title="Network Details"
            isEdit={true}
        />
    )
}

export default NetworkDetailsPage
