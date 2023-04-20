import checkmarkMiniIcon from "../../assets/images/icons/checkmark_mini.svg"
import classnames from "classnames"
import { useState, FunctionComponent } from "react"
import { formatName } from "../../util/formatAccount"
import { Currency } from "@block-wallet/background/utils/currency"
import { capitalize } from "../../util/capitalize"

type CurrencyDisplayType = {
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
 * @param data - Object containing token to display's informations.
 * @param clickable - Determines if you can click element to show selected style.
 * @param active - Determines if the element is already showing selected style.
 * @param hoverable - Determines if the element shows a hover style.
 */
const CurrencyDisplay: FunctionComponent<CurrencyDisplayType> = ({
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
                selected && "bg-primary-grey-hover",
                hoverable && "hover:bg-primary-grey-default"
            )}
            onClick={() => (clickable ? setSelected(!selected) : null)}
        >
            <div className="flex flex-col ml-4 truncate">
                <span
                    className={
                        "text-sm text-primary-black-default font-semibold"
                    }
                >
                    {formatName(data.name, 22)}
                </span>
            </div>
            <p className={"text-sm text-gray-400 ml-auto pl-1 pr-6"}>
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
