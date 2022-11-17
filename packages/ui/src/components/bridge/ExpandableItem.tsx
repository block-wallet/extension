import { FC, ReactNode, useState } from "react"
import classnames from "classnames"
import { ArrowUpDown } from "../icons/ArrowUpDown"

interface ExpandableItem {
    children: ReactNode
    expanded: ReactNode
    className?: string
    expandable: boolean
    defaultExpanded?: boolean
}
const ExpandableItem: FC<ExpandableItem> = ({
    children,
    expanded,
    className,
    expandable,
    defaultExpanded = false,
}) => {
    const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded)
    return (
        <div className="flex flex-col space-y-0.5">
            <div
                onClick={() => {
                    setIsExpanded((prev) => !prev)
                }}
                className={classnames(
                    "flex items-center flex-row space-x-2",
                    expandable ? "cursor-pointer" : "cursor-default",
                    className
                )}
            >
                {expandable && <ArrowUpDown active={isExpanded} />}
                <span className="ml-1">{children}</span>
            </div>
            {expandable && isExpanded && (
                <span className={classnames("p-0.5")}>{expanded}</span>
            )}
        </div>
    )
}

export default ExpandableItem
