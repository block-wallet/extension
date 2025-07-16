/* Wrapper element that contains this component should have class "group relative" */

import classnames from "classnames"
import { FunctionComponent } from "react"

const Tooltip: FunctionComponent<{
    content: string | React.ReactElement
    className?: string
}> = ({ content, className }) => (
    <div
        className={classnames(
            className || "",
            "pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 text-xs font-medium shadow-lg rounded-md",
            "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border border-gray-800 dark:border-gray-200 whitespace-nowrap",
            "invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 z-[100] w-fit h-fit"
        )}
    >
        <div className="relative">
            <span className="flex flex-row items-center">{content}</span>
        </div>
    </div>
)

export default Tooltip
