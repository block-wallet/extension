import NetworkLogo from "./NetworkLogo"
import checkmarkMiniIcon from "../../assets/images/icons/checkmark_mini.svg"
import classNames from "classnames"
import { FunctionComponent } from "react"
import { IChain } from "@block-wallet/background/utils/types/chain"

interface DropdownNetworkDisplayProps {
    network: IChain
    active?: boolean
}

/**
 * Network display component
 *
 * @param network - Object containing the network info
 * @param active - Determines if the element is already showing selected style.
 */
const DropdownNetworkDisplay: FunctionComponent<
    DropdownNetworkDisplayProps
> = ({ network, active = false }) => {
    return (
        <div
            className={classNames(
                "flex justify-between items-center flex-row relative px-3 mt-1 rounded-md transition-all duration-300 active:scale-95 hover:bg-primary-100",
                active && "bg-primary-200"
            )}
        >
            <img
                src={checkmarkMiniIcon}
                alt="checkmark"
                className={classNames(
                    "absolute mr-6 right-0",
                    active ? "visible" : "hidden"
                )}
            />
            <div className="flex justify-start items-center flex-row py-3">
                <div className="flex flex-row items-center justify-center w-9 h-9 p-1.5 bg-white border border-gray-200 rounded-full">
                    <NetworkLogo
                        iconUrl={network.logoURI}
                        name={network.name}
                    />
                </div>
                <div
                    className={
                        "flex justify-start items-center h-full box-border ml-4"
                    }
                >
                    <span className={"text-base text-black font-semibold mr-1"}>
                        {network.name}
                    </span>
                </div>
            </div>
        </div>
    )
}

export default DropdownNetworkDisplay
