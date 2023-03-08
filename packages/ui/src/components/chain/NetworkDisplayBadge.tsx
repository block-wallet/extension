import { Network } from "@block-wallet/background/utils/constants/networks"
import { classnames } from "../../styles"
import { getNetworkColor } from "../../util/getNetworkColor"
import GenericTooltip from "../label/GenericTooltip"
import useIsHovering from "../../util/hooks/useIsHovering"

const NetworkDisplayBadge = ({
    network,
    className,
    fill = false,
    truncate = false,
}: {
    network: Network
    fill?: boolean
    truncate?: boolean
    className?: string
}) => {
    const networkDesc = network.desc
    const networkColor = getNetworkColor(network)
    const { isHovering, getIsHoveringProps } = useIsHovering()

    // We limit the string chars here regardless of the truncate flag
    // and the truncate class to prevent issues with the animated bullet size
    // and to have a limit on huge network descriptions.
    const formattedNetworkName = truncate
        ? networkDesc.length > 42
            ? `${networkDesc.slice(0, 42)}...`
            : networkDesc
        : networkDesc

    const displayFull =
        isHovering ||
        !(network.iconUrls && network.iconUrls.length > 0) ||
        !truncate

    return (
        <div
            {...getIsHoveringProps()}
            className={classnames(
                "flex flex-row items-center py-1.5 px-1.5 text-gray-600 rounded-md group bg-primary-grey-default border-primary-200 text-xs",
                fill && "bg-green-100",
                "w-auto",
                className
            )}
        >
            {network.iconUrls && network.iconUrls.length > 0 ? (
                <img
                    src={network.iconUrls[0]}
                    alt="network icon"
                    className={classnames("w-4 h-4", displayFull && "mr-2")}
                />
            ) : (
                <span
                    className={classnames(
                        "justify-end h-2 rounded-xl ml-1 animate-pulse pointer-events-none",
                        displayFull && "mr-2"
                    )}
                    style={{ backgroundColor: networkColor, width: "8px" }}
                />
            )}

            <span
                className={classnames(
                    displayFull
                        ? truncate
                            ? "flex justify-center truncate ..."
                            : "flex justify-center whitespace-normal break-all flex-1"
                        : "hidden"
                )}
                style={
                    displayFull && truncate
                        ? { maxWidth: 80, display: "block" }
                        : {}
                }
            >
                {formattedNetworkName}
            </span>
            <GenericTooltip
                left
                className="translate-y-5 translate-x-3 shadow-md min-w-max"
                content={<p className=" p-1 text-left">{networkDesc}</p>}
            />
        </div>
    )
}

export default NetworkDisplayBadge
