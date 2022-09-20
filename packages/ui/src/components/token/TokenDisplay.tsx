import TokenLogo from "./TokenLogo"
import checkmarkMiniIcon from "../../assets/images/icons/checkmark_mini.svg"
import classnames from "classnames"
import { TokenResponse } from "../../routes/settings/AddTokensPage"
import { useState, FunctionComponent } from "react"

type TokenDisplayType = {
    data: TokenResponse
    clickable?: boolean
    active?: boolean | false
    hoverable?: boolean | false
    textSize?: "base" | "sm"
    isSmall?: boolean | false
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
 * @param isSmall - small font size, to fit into popup for example
 */
const TokenDisplay: FunctionComponent<TokenDisplayType> = ({
    data,
    clickable,
    active,
    hoverable,
    textSize = "base",
    isSmall,
}) => {
    const [selected, setSelected] = useState<boolean>(active ? active : false)

    // Maximum characters to be displayed
    const chars = 20

    const printSymbol = (symbol: string, name: string) => {
        if (symbol.length < chars - name.length) {
            return symbol
        } else {
            if (name.length < chars - 2) {
                return `${symbol.slice(0, chars - 2 - name.length)}..`
            } else {
                return `${symbol.slice(0, 3)}..`
            }
        }
    }

    const printName = (name: string, symbol: string) => {
        if (name.length < chars - symbol.length) {
            return name
        } else {
            return `${name.substring(0, chars - 5)}..`
        }
    }

    return (
        <div
            className={classnames(
                "flex items-center p-3 my-0.5 rounded-md transition-all duration-300 active:scale-95",
                clickable && "cursor-pointer",
                selected && "bg-primary-200",
                hoverable && "hover:bg-primary-100"
            )}
            onClick={() => (clickable ? setSelected(!selected) : null)}
        >
            <div className="flex items-center justify-center w-8 h-8">
                <TokenLogo src={data.logo} alt={data.name} />
            </div>
            <div
                className={classnames(
                    "flex justify-start items-center h-full box-border",
                    isSmall ? "ml-1" : "ml-4"
                )}
            >
                <span
                    className={classnames(
                        `text-${textSize}`,
                        isSmall
                            ? "text-xs font-small"
                            : "text-black font-semibold mr-1"
                    )}
                >
                    {printName(data.name, data.symbol)}
                </span>
                <span
                    className={classnames(
                        "text-gray-400",
                        isSmall
                            ? "text-xs font-small text-overflow"
                            : `text-${textSize}`
                    )}
                >
                    {printSymbol(data.symbol, data.name)}
                </span>
            </div>
            <img
                src={checkmarkMiniIcon}
                alt="checkmark"
                className={classnames(
                    "absolute right-6",
                    selected ? "visible" : "hidden"
                )}
            />
        </div>
    )
}

export default TokenDisplay
