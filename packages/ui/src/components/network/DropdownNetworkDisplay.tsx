import NetworkLogo from "./NetworkLogo"
import checkmarkMiniIcon from "../../assets/images/icons/checkmark_mini.svg"
import classNames from "classnames"
import { FunctionComponent } from "react"
import { IChain } from "@block-wallet/background/utils/types/chain"

interface DropdownNetworkDisplayProps {
    network: IChain
    active?: boolean
    onClick?: React.MouseEventHandler<HTMLDivElement>
}

/**
 * Network display component for dropdown items
 *
 * @param network - Object containing the network info
 * @param active - Determines if the element is already showing selected style.
 * @param onClick - onClick callback
 */
const DropdownNetworkDisplay: FunctionComponent<
    DropdownNetworkDisplayProps
> = ({ network, active = false, onClick }) => {
    return (
        <div
            className={classNames(
                "flex flex-row items-center w-full p-3 mx-1 rounded-lg cursor-pointer group",
                "transition-all duration-200 ease-in-out",
                "hover:bg-gray-100 dark:hover:bg-gray-700",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20",
                active ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800" : "border border-transparent"
            )}
            onClick={onClick}
            role="button"
            tabIndex={0}
        >
            <div className="flex items-center flex-1 min-w-0">
                <NetworkLogo
                    logo={network.logo}
                    name={network.name}
                    bigLogo={false}
                />
                <div
                    className={classNames(
                        "text-sm font-semibold ml-3 truncate transition-colors duration-200",
                        active
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200"
                    )}
                    title={network.name}
                >
                    {network.name}
                </div>
            </div>
            {active && (
                <div className="flex items-center justify-center w-5 h-5 ml-3 flex-shrink-0">
                    <img
                        src={checkmarkMiniIcon}
                        alt="Selected"
                        className="w-4 h-4 text-blue-600"
                    />
                </div>
            )}
        </div>
    )
}

export default DropdownNetworkDisplay
