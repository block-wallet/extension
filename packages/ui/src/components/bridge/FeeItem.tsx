import { IToken } from "@block-wallet/background/controllers/erc-20/Token"
import { formatUnits } from "@ethersproject/units"
import { formatRounded } from "../../util/formatRounded"
import { IBridgeFeeCost } from "@block-wallet/background/utils/bridgeApi"
import ExpandableItem from "./ExpandableItem"

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
    expandable = true,
}: {
    detail: Unpacked<IBridgeFeeCost["details"]>
    token: IToken
    expandable: boolean
}) => {
    const amountStr = `${formatRounded(
        formatUnits(detail.amount, token.decimals),
        4
    )} ${token.symbol}`
    return (
        <li>
            <ExpandableItem
                expandable={expandable}
                expanded={
                    <i className="ml-1 text-primary-grey-dark">
                        {detail.description ?? detail.name}
                    </i>
                }
            >
                <div>
                    <span className="font-semibold">{detail.name}:</span>
                    <span className="ml-1">{amountStr}</span>
                </div>
            </ExpandableItem>
        </li>
    )
}

export default FeeItem
