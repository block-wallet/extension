/* Wrapper element that contains this component should have class "group relative" */

import classnames from "classnames"
import { FunctionComponent } from "react"
import { ImCheckmark } from "react-icons/im"

const CopyTooltip: FunctionComponent<{
    copied: boolean
    text?: string
}> = ({ copied = false, text }) => (
    <div
        className={classnames(
            "pointer-events-none absolute bottom-0 -mb-4 left-1/2 transform -translate-x-1/2 translate-y-full p-2 rounded-md text-xs font-semibold bg-primary-black-default text-white whitespace-nowrap",
            "invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200"
        )}
        style={{ width: "fit-content", height: "fit-content", zIndex: 100 }}
    >
        <div className="relative">
            {copied ? (
                <span className="flex flex-row items-center">
                    <ImCheckmark
                        className="mr-2"
                        style={{ fontSize: "0.6rem" }}
                    />
                    Copied!
                </span>
            ) : (
                <span>{text ? text : "Copy to clipboard"}</span>
            )}
        </div>
    </div>
)

export default CopyTooltip
