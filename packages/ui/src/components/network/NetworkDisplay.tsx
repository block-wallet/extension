import { FC } from "react"
import unknownTokenIcon from "../../assets/images/unknown_token.svg"
import { IChain } from "@block-wallet/background/utils/types/chain"

interface NetworkDisplayProps {
    network: IChain
}

const NetworkDisplay: FC<NetworkDisplayProps> = ({ network }) => {
    return (
        <div className="flex flex-row items-center space-x-1 w-full p-4 rounded-md bg-primary-100">
            <span className="flex items-center justify-center !w-6 !h-6 rounded-full">
                <img
                    src={network.logoURI || unknownTokenIcon}
                    alt={network.name}
                    className="rounded-full"
                />
            </span>
            <span
                className="text-base truncate font-semibold"
                title={network.name}
            >
                {network.name}
            </span>
        </div>
    )
}

export default NetworkDisplay
