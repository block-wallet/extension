/* Wrapper element that contains this component should have class "group relative" */

import classnames from "classnames"
import React from "react"
import { FunctionComponent } from "react"

const Tooltip: FunctionComponent<{
    content: string | React.ReactElement
    className?: string
}> = ({ content, className }) => (
    <div
        className={classnames(
            className || "",
            "pointer-events-none absolute bottom-0 -mb-2 transform -translate-x-1/3 translate-y-3/4 p-2 text-xs shadow-md rounded-md bg-white whitespace-nowrap",
            "invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 z-50 w-fit h-fit"
        )}
    >
        <div className="relative">
            <span className="flex flex-row items-center">{content}</span>
        </div>
    </div>
)

export default Tooltip
