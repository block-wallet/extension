import { CgDanger } from "react-icons/cg"
import { useLocation } from "react-router-dom"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { Classes, classnames } from "../../styles"
import NetworkSelect from "../input/NetworkSelect"
import MessageDialog from "./MessageDialog"

// Allowed paths to prevent the dialog from showing up
const allowedPaths = [
    "/chain/switch",
    "/settings/networks",
    "/settings/networks/details",
]

const ProviderDownDialog = () => {
    const { isProviderNetworkOnline, isUserNetworkOnline } = useBlankState()!
    const location = useLocation()
    const history = useOnMountHistory()

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
                title="Network Provider Down"
                message={
                    <div className="mb-4">
                        <p className="mb-2">
                            Please check your internet connection and restart
                            the wallet using the button below.
                        </p>
                        <p>
                            If the problem persists, try{" "}
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
