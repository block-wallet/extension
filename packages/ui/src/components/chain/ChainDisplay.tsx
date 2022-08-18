import { FC } from "react"
import checkmarkMiniIcon from "../../assets/images/icons/checkmark_mini.svg"
import classnames from "classnames"
import unkownLogoUrl from "../../assets/images/icons/ETH.svg"
import Tag from "../ui/Tag"

interface Props {
    onClick?: () => void
    name: string
    logoUrl?: string
    chainId: number
    selected: boolean
    isEnabled: boolean
    isTestnet: boolean
}
const ChainDisplay: FC<Props> = ({
    onClick,
    name,
    logoUrl,
    chainId,
    selected,
    isEnabled,
    isTestnet,
}) => {
    return (
        <div
            className={classnames(
                "flex justify-between items-center flex-row relative px-3 mt-1 rounded-md transition-all duration-300 active:scale-95",
                onClick && "cursor-pointer hover:bg-primary-100",
                selected && "bg-primary-200"
            )}
            onClick={onClick}
        >
            <img
                src={checkmarkMiniIcon}
                alt="checkmark"
                className={classnames(
                    "absolute mr-6 right-0",
                    selected ? "visible" : "hidden"
                )}
            />
            <div
                className="flex justify-start items-center flex-row py-3"
                title={name}
            >
                <div className="flex flex-row items-center justify-center w-9 h-9 p-1.5 bg-white border border-gray-200 rounded-full">
                    <img
                        src={logoUrl || unkownLogoUrl}
                        onError={(e) => {
                            ;(e.target as any).onerror = null
                            ;(e.target as any).src = unkownLogoUrl
                        }}
                        alt={name}
                        className="rounded-full"
                    />
                </div>
                <div className="flex flex-col space-y-1 justify-start h-full box-border ml-4">
                    <span className="text-sm text-black font-semibold mr-1 truncate w-48">
                        {name}
                    </span>
                    <span className="text-gray-400 text-xs font-small text-overflow flex flex-row space-x-2 items-center">
                        <span>Chain: {chainId}</span>
                        {isEnabled && (
                            <Tag size="sm" profile="success">
                                Enabled
                            </Tag>
                        )}
                        {isTestnet && (
                            <Tag size="sm" profile="info">
                                Testnet
                            </Tag>
                        )}
                    </span>
                </div>
            </div>
        </div>
    )
}
export default ChainDisplay
