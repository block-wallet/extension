import { CgDanger } from "react-icons/cg"
import { useLocation } from "react-router-dom"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { Classes, classnames } from "../../styles"
import NetworkSelect from "../input/NetworkSelect"
import MessageDialog from "./MessageDialog"

const ProviderDownDialog = () => {
    const { isProviderNetworkOnline, isUserNetworkOnline } = useBlankState()!
    const location = useLocation()
    const history = useOnMountHistory()

    // Allowed paths to prevent the dialog from showing up
    const allowedPaths = [
        "/chain/switch",
        "/settings/networks",
        "/settings/networks/details",
    ]

    const showDialog =
        !isProviderNetworkOnline &&
        isUserNetworkOnline &&
        !allowedPaths.includes(location.pathname)

    return (
        <>
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
                message={
                    <div className="mb-4">
                        <p className="mb-2">
                            The current network provider is down. Please check
                            your internet connection or select another network.
                        </p>
                        <p>
                            If the problem persists, try restarting the wallet
                            or{" "}
                            <a
                                className="text-primary-300 cursor-pointer"
                                onClick={() =>
                                    history.push({
                                        pathname: "/settings/networks",
                                        state: {
                                            isFromHomePage: true,
                                        },
                                    })
                                }
                            >
                                changing the network's RPC URL
                            </a>
                            .
                        </p>
                    </div>
                }
                open={showDialog}
                footer={
                    <button
                        onClick={() => chrome.runtime.reload()}
                        type="button"
                        className={classnames(Classes.darkButton)}
                    >
                        Restart Wallet
                    </button>
                }
            />
        </>
    )
}

export default ProviderDownDialog
