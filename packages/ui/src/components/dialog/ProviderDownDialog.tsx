import { CgDanger } from "react-icons/cg"
import { useLocation } from "react-router-dom"
import { useBlankState } from "../../context/background/backgroundHooks"
import NetworkSelect from "../input/NetworkSelect"
import MessageDialog from "./MessageDialog"

const ProviderDownDialog = () => {
    const { isProviderNetworkOnline, isUserNetworkOnline } = useBlankState()!
    const location = useLocation()

    const showDialog =
        !isProviderNetworkOnline &&
        isUserNetworkOnline &&
        location.pathname !== "/chain/switch"

    return (
        <MessageDialog
            header={
                <>
                    <NetworkSelect
                        className="mb-4 m-auto"
                        optionsContainerClassName="overflow-auto max-h-72"
                    />
                    <CgDanger className="text-red-500 w-20 h-20 mb-2 block m-auto" />
                </>
            }
            title="Provider down"
            message="The current network is down. Please select another network."
            open={showDialog}
        />
    )
}

export default ProviderDownDialog
