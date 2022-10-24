import TokenLogo from "./TokenLogo"
import checkmarkMiniIcon from "../../assets/images/icons/checkmark_mini.svg"
import classnames from "classnames"
import { useState, FunctionComponent } from "react"
import { TokenWithBalance } from "../../context/hooks/useTokensList"
import { formatUnits } from "ethers/lib/utils"
import { formatRounded } from "../../util/formatRounded"

type TokenDisplayType = {
    data: TokenWithBalance
    clickable?: boolean
    active?: boolean | false
    hoverable?: boolean | false
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
 */
const TokenDisplay: FunctionComponent<TokenDisplayType> = ({
    data,
    clickable,
    active,
    hoverable,
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
            <TokenLogo bigLogo logo={data.token.logo} name={data.token.name} />
            <p className="ml-4 truncate">
                <span className={"text-sm text-black font-semibold"}>
                    {data.token.name}
                </span>
                <span
                    className="text-xs text-gray-600"
                    title={formatUnits(
                        data.balance || "0",
                        data.token.decimals
                    )}
                >
                    <br />
                    Balance:{" "}
                    {formatRounded(
                        formatUnits(data.balance || "0", data.token.decimals),
                        6
                    )}
                </span>
            </p>
            <p className={"text-sm text-gray-400 ml-auto pl-1 pr-6"}>
                {data.token.symbol}
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
