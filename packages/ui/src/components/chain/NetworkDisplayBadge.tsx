import { Network } from "@block-wallet/background/utils/constants/networks"
import { classnames } from "../../styles"
import { getNetworkColor } from "../../util/getNetworkColor"
import GenericTooltip from "../label/GenericTooltip"

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

    // We limit the string chars here regardless of the truncate flag
    // and the truncate class to prevent issues with the animated bullet size
    // and to have a limit on huge network descriptions.
    const formattedNetworkName = truncate
        ? networkDesc.length > 42
            ? `${networkDesc.slice(0, 42)}...`
            : networkDesc
        : networkDesc
    return (
        <div
            className={classnames(
                "flex flex-row items-center py-1.5 px-1.5 text-gray-600 rounded-md group border border-primary-200 text-xs",
                fill && "bg-green-100",
                "w-auto",
                className
            )}
        >
            <span
                className={
                    "justify-end h-2 rounded-xl mr-2 ml-1 animate-pulse pointer-events-none"
                }
                style={{ backgroundColor: networkColor, width: "8px" }}
            />
            <span
                className={classnames(
                    truncate
                        ? "flex justify-center truncate ..."
                        : "flex justify-center whitespace-normal break-all flex-1"
                )}
                style={truncate ? { maxWidth: 130 } : {}}
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
