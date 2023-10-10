import { Network } from "@block-wallet/background/utils/constants/networks"
import { classnames } from "../../styles"
import { getNetworkColor } from "../../util/getNetworkColor"
import GenericTooltip from "../label/GenericTooltip"
import { useState } from "react"

const NetworkDisplayBadge = ({
    network,
    className,
    showName = false,
}: {
    network: Network
    className?: string
    showName?: boolean
}) => {
    const networkDesc = network.desc
    const networkColor = getNetworkColor(network)
    const [hasImageError, setHasImageError] = useState(false)

    return (
        <div
            className={classnames(
                "flex flex-row items-center h-6 w-6 self-center justify-center text-primary-grey-dark rounded group bg-primary-grey-default hover:bg-primary-grey-hover border-primary-200 text-xs",
                className
            )}
        >
            {!hasImageError &&
            network.iconUrls &&
            network.iconUrls.length > 0 ? (
                <img
                    src={network.iconUrls[0]}
                    alt="network icon"
                    className={classnames("w-4 h-4", showName && "mr-2")}
                    onError={() => {
                        setHasImageError(true)
                    }}
                />
            ) : (
                <span
                    className={classnames(
                        "justify-end h-2 rounded-xl mx-1 animate-pulse pointer-events-none",
                        showName && "mr-1"
                    )}
                    style={{ backgroundColor: networkColor, width: "9px" }}
                />
            )}

            {showName && (
                <span
                    className={classnames(
                        "flex justify-center whitespace-normal break-all flex-1"
                    )}
                >
                    {networkDesc}
                </span>
            )}

            <GenericTooltip
                left
                className="!translate-y-5 !translate-x-3 shadow-md min-w-max"
                content={<p className=" p-1 text-left">{networkDesc}</p>}
            />
        </div>
    )
}

export default NetworkDisplayBadge
