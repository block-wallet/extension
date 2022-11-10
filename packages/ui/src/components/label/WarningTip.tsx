import { useState } from "react"
import { FunctionComponent } from "react"
import classnames from "classnames"
import ExclamationCircleIconFull from "../icons/ExclamationCircleIconFull"
import CloseIcon from "../icons/CloseIcon"

const warningBgStyle = {
    backgroundColor: "#F9F2E7",
    color: "#FFBB54",
}

/**
 * Warning tip component.
 *
 * @param text Warning to display.
 * @param withCloseIcon If true the tooltip will have a close button.
 * @param fontSize Set font size. Default is "text-lg".
 * @param justify Set flexbox justify. Default is "justify-center".
 * @param className Add custom styles to wrapper.
 */
const WarningTip: FunctionComponent<{
    className?: string
    fontSize?: string
    justify?: string
    text: string | JSX.Element
    withCloseIcon?: boolean
}> = ({ className, fontSize, justify, text, withCloseIcon = false }) => {
    const [isClosed, setIsClosed] = useState(false)

    return isClosed ? null : (
        <div
            className={classnames(
                "relative flex flex-row p-3 items-center rounded",
                justify ?? "justify-center",
                className ?? className
            )}
            style={warningBgStyle}
        >
            <div>
                <ExclamationCircleIconFull size="20" profile="outlined" />
            </div>
            <p
                className={classnames(
                    "text-yellow-500 break-words ml-3",
                    fontSize ?? "text-lg"
                )}
            >
                {text}
            </p>
            {withCloseIcon && (
                <>
                    <div className={"w-5"}></div>
                    <div
                        className={
                            "absolute right-3 cursor-pointer hover:text-yellow-500"
                        }
                        onClick={() => setIsClosed(true)}
                    >
                        <CloseIcon size="10" />
                    </div>
                </>
            )}
        </div>
    )
}

export default WarningTip
