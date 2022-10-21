import { IToken } from "@block-wallet/background/controllers/erc-20/Token"
import { formatUnits } from "ethers/lib/utils"
import classnames from "classnames"
import { useState } from "react"
import { formatRounded } from "../../util/formatRounded"
import { ArrowUpDown } from "../icons/ArrowUpDown"
import { IBridgeFeeCost } from "@block-wallet/background/utils/bridgeApi"

type Unpacked<T> = T extends (infer U)[]
    ? U
    : T extends (...args: any[]) => infer U
    ? U
    : T extends Promise<infer U>
    ? U
    : T

const FeeItem = ({
    detail,
    token,
}: {
    detail: Unpacked<IBridgeFeeCost["details"]>
    token: IToken
}) => {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(true)
    const amountStr = `${formatRounded(
        formatUnits(detail.amount, token.decimals),
        4
    )} ${token.symbol}`
    return (
        <li>
            <div
                className="flex items-center cursor-pointer space-x-1"
                onClick={() => {
                    setIsCollapsed(!isCollapsed)
                }}
            >
                <ArrowUpDown active={!isCollapsed} />
                <div>
                    <span className="font-bold">{detail.name}:</span>
                    <span className="ml-1">{amountStr}</span>
                </div>
            </div>
            <div
                className={classnames(
                    "overflow-hidden",
                    isCollapsed ? "h-0" : ""
                )}
            >
                <i className="ml-1 text-gray-500">{`${detail.description} (${detail.percentage}%)`}</i>
            </div>
        </li>
    )
}

export default FeeItem
