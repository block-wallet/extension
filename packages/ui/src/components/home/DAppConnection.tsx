import { useHistory } from "react-router-dom"
import { useConnectedSite } from "../../context/hooks/useConnectedSite"
import GenericTooltip from "../label/GenericTooltip"
import classnames from "classnames"
import { HiOutlineExclamationCircle } from "react-icons/hi"
import { BiCircle } from "react-icons/bi"
import { session } from "../../context/setup"

const DAppConnection = () => {
    const dAppConnected = useConnectedSite()
    const history = useHistory()!
    return (
        <GenericTooltip
            bottom
            className="p-2 w-150 overflow-auto -m-4 transition delay-300 hover:delay-0 ease-in-out"
            content={
                <div>
                    <p className="w-100 text-center">
                        {dAppConnected === "connected" ? (
                            <span>You are connected to the open site</span>
                        ) : (
                            <span>You are not connected to the open site</span>
                        )}
                    </p>
                </div>
            }
        >
            <div
                onClick={() => {
                    if (dAppConnected !== "not-connected") {
                        history.push({
                            pathname:
                                "/accounts/menu/connectedSites/accountList",
                            state: {
                                origin: session?.origin,
                                fromRoot: true,
                            },
                        })
                    }
                }}
                className={classnames(
                    "relative flex flex-row items-center py-1  text-primary-grey-dark rounded-md group border-primary-200  text-xs cursor-pointer",
                    dAppConnected === "connected" &&
                        "bg-green-100 hover:border-green-300",
                    dAppConnected === "connected-warning" &&
                        "bg-yellow-100 hover:border-yellow-300",
                    dAppConnected === "not-connected" && "pointer-events-none"
                )}
            >
                {dAppConnected === "connected" && (
                    <span className="relative inline-flex rounded-full h-2 w-2 mr-2 animate-pulse bg-green-400 pointer-events-none"></span>
                )}

                {dAppConnected === "connected-warning" && (
                    <HiOutlineExclamationCircle
                        size={16}
                        className="mr-1 text-yellow-600"
                    />
                )}

                {dAppConnected === "not-connected" && (
                    <BiCircle className="mr-1 w-2" />
                )}

                <span
                    className={classnames(
                        "mr-1 pointer-events-none",
                        dAppConnected === "connected" &&
                            "text-secondary-green-default",
                        dAppConnected === "connected-warning" &&
                            "text-yellow-600"
                    )}
                >
                    {dAppConnected === "not-connected"
                        ? "Not connected"
                        : "Connected"}
                </span>
            </div>
        </GenericTooltip>
    )
}

export default DAppConnection
