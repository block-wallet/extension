import checkmarkMiniIcon from "../../assets/images/icons/checkmark_mini.svg"
import classnames from "classnames"
import { useState, FunctionComponent } from "react"
import { formatName } from "../../util/formatAccount"
import { Currency } from "@block-wallet/background/utils/currency"

type CurrencyDisplayProps = {
    data: Currency
    clickable?: boolean
    active?: boolean | false
    hoverable?: boolean | false
}

/**
 * CurrencyDisplay:
 * Creates a display element to show currency information.
 * Can or cannot be clicked to show a selected style.
 * Can show a selected style.
 *
 * @param data - Object containing currency to display's informations.
 * @param clickable - Determines if you can click element to show selected style.
 * @param active - Determines if the element is already showing selected style.
 * @param hoverable - Determines if the element shows a hover style.
 */
const CurrencyDisplay: FunctionComponent<CurrencyDisplayProps> = ({
    data,
    clickable,
    active,
    hoverable,
}) => {
    const [selected, setSelected] = useState<boolean>(active ? active : false)

    // Render
    return (
        <div
            className={classnames(
                "relative flex items-center p-3 my-0.5 rounded-md transition-all duration-300 active:scale-95",
                clickable && "cursor-pointer",
                selected && "bg-gray-100 dark:bg-gray-700",
                hoverable && "hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
            onClick={() => (clickable ? setSelected(!selected) : null)}
        >
            <div className="flex flex-col mx-2 truncate">
                {data.symbol ?? <label className="text-gray-600 dark:text-gray-400">{data.symbol}</label>}
            </div>
            <span
                className="flex text-sm text-gray-900 dark:text-gray-100 font-semibold"
            >
                {formatName(data.name, 22)}
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400 ml-auto pl-1 pr-6">
                {data.code.toUpperCase()}
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

export default CurrencyDisplay
