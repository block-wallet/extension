import TokenLogo from "./TokenLogo"
import checkmarkMiniIcon from "../../assets/images/icons/checkmark_mini.svg"
import classnames from "classnames"
import { useState, FunctionComponent } from "react"
import { formatUnits } from "ethers/lib/utils"
import { formatRounded } from "../../util/formatRounded"
import { TokenResponse } from "../../routes/settings/AddTokensPage"
import { BigNumber } from "ethers"

type TokenDisplayType = {
    data: TokenResponse
    clickable?: boolean
    active?: boolean | false
    hoverable?: boolean | false
    balance?: BigNumber | undefined
}

/**
 * TokenDisplay:
 * Creates a display element to show token information.
 * Can or cannot be clicked to show a selected style.
 * Can show a selected style.
 *
 * @param data - Object containing token to display's informations.
 * @param clickable - Determines if you can click element to show selected style.
 * @param active - Determines if the element is already showing selected style.
 * @param hoverable - Determines if the element shows a hover style.
 * @param balance - Contains the asset balance in case it exists. e.g. if it is a New Asset there is no balance
 */
const TokenDisplay: FunctionComponent<TokenDisplayType> = ({
    data,
    clickable,
    active,
    hoverable,
    balance,
}) => {
    const [selected, setSelected] = useState<boolean>(active ? active : false)

    return (
        <div
            className={classnames(
                "relative flex items-center p-3 my-0.5 rounded-md transition-all duration-300 active:scale-95",
                clickable && "cursor-pointer",
                selected && "bg-primary-200",
                hoverable && "hover:bg-primary-100"
            )}
            onClick={() => (clickable ? setSelected(!selected) : null)}
        >
            <TokenLogo bigLogo logo={data.logo} name={data.name} />
            <div className="flex flex-col ml-4 truncate">
                <span className={"text-sm text-black font-semibold"}>
                    {data.name}
                </span>
                {balance && (
                    <span
                        className={"text-xs text-gray-600 mt-1"}
                        title={formatUnits(balance, data.decimals)}
                    >
                        {formatRounded(formatUnits(balance, data.decimals), 6)}
                    </span>
                )}
            </div>
            <p className={"text-sm text-gray-400 ml-auto pl-1 pr-6"}>
                {data.symbol}
            </p>
            <img
                src={checkmarkMiniIcon}
                alt="checkmark"
                className={classnames(
                    "absolute right-3",
                    selected ? "visible" : "hidden"
                )}
            />
        </div>
    )
}

export default TokenDisplay
