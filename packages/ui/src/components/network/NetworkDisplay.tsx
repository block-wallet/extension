import NetworkLogo from "./NetworkLogo"
import classnames from "classnames"
import { FunctionComponent } from "react"
import { IChain } from "@block-wallet/background/utils/types/chain"

interface NetworkDisplayProps {
    network: IChain
    padding?: boolean
    transparent?: boolean
    bigLogo?: boolean
    compact?: boolean
}

const NetworkDisplay: FunctionComponent<NetworkDisplayProps> = ({
    network,
    padding = true,
    transparent = false,
    bigLogo,
    compact = false,
}) => {
    return (
        <div
            className={classnames(
                "flex flex-row items-center w-full rounded-lg transition-all duration-200",
                padding && (compact ? "p-2" : "p-4"),
                !transparent && "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            )}
        >
            <NetworkLogo
                logo={network.logo}
                name={network.name}
                bigLogo={bigLogo}
            />
            <div
                className={classnames(
                    "truncate font-semibold ml-3 text-gray-900 dark:text-white",
                    compact ? "text-sm" : "text-base"
                )}
                title={network.name}
            >
                {network.name}
            </div>
        </div>
    )
}

export default NetworkDisplay
