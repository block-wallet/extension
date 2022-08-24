import NetworkLogo from "./NetworkLogo"
import classnames from "classnames"
import { FunctionComponent } from "react"
import { IChain } from "@block-wallet/background/utils/types/chain"

interface NetworkDisplayProps {
    network: IChain
    padding?: boolean
    transparent?: boolean
    bigLogo?: boolean
}

const NetworkDisplay: FunctionComponent<NetworkDisplayProps> = ({
    network,
    padding = true,
    transparent = false,
    bigLogo,
}) => {
    return (
        <div
            className={classnames(
                "flex flex-row items-center w-full rounded-md",
                padding && "p-4",
                !transparent && "bg-primary-100"
            )}
        >
            <NetworkLogo
                logo={network.logo}
                name={network.name}
                bigLogo={bigLogo}
            />
            <div
                className="text-base truncate font-semibold ml-2"
                title={network.name}
            >
                {network.name}
            </div>
        </div>
    )
}

export default NetworkDisplay
