import { Network } from "@block-wallet/background/utils/constants/networks"
import NetworkFormPage from "./NetworkFormPage"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

const ManuallyAddNetwork = () => {
    const history = useOnMountHistory<{ hint: string }>()
    const state = history.location.state
    const formNetwork: Partial<Network> = isNaN(Number(state.hint))
        ? { name: state.hint }
        : { chainId: state.hint ? Number(state.hint) : undefined }
    return (
        <NetworkFormPage
            canDelete={false}
            editMode="all"
            title="Add New Network"
            network={formNetwork}
            isEdit={false}
        />
    )
}

export default ManuallyAddNetwork
