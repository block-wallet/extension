import { ChainListItem } from "@block-wallet/background/utils/chainlist"
import { getFirstUrl } from "../../util/networkUtils"
import NetworkFormPage from "./NetworkFormPage"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

const SuggestedAddNetwork = () => {
    const history = useOnMountHistory<{
        suggestedChain: ChainListItem
    }>()

    const { suggestedChain } = history.location.state

    const formNetwork = {
        rpcUrl: getFirstUrl(suggestedChain.rpc),
        blockExplorerUrl: getFirstUrl(
            suggestedChain.explorers?.map((e) => e.url)
        ),
        chainId: suggestedChain.chainId,
        name: suggestedChain?.name,
        symbol: suggestedChain.nativeCurrency?.symbol,
        isTestnet: suggestedChain.isTestnet,
    }

    return (
        <NetworkFormPage
            canDelete={false}
            editMode="minimal"
            title="Add New Network"
            network={formNetwork}
            isEdit={false}
        />
    )
}

export default SuggestedAddNetwork
