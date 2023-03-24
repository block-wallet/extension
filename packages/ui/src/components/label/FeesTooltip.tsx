/* Wrapper element that contains this component should have class "group relative" */

import classnames from "classnames"
import { FunctionComponent } from "react"

const FeesTooltip: FunctionComponent<{
    content: string | React.ReactElement
}> = ({ content }) => (
    <div
        className={classnames(
            "pointer-events-none absolute bottom-0 -mb-4 left-1/2 transform  -translate-y-10 p-2 shadow-md rounded-md text-xs font-semibold bg-gray-900 text-white whitespace-nowrap",
            "invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200"
        )}
        style={{ width: "fit-content", height: "fit-content" }}
    >
        <div className="relative">
            <div className="border-t-4 border-r-4 border-gray-900 absolute -bottom-2 -left-2 w-2 h-2 -mt-2.5 transform -rotate-180" />
            {content}
        </div>
    </div>
)

export default FeesTooltip
