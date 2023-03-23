import classnames from "classnames"
import { useState } from "react"
import { ArrowUpDown } from "../icons/ArrowUpDown"

const BridgeNotFoundItem = ({
    tool,
    message,
    details,
}: {
    tool: string
    message: string
    details: string[]
}) => {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(true)

    return (
        <>
            <div
                className="flex items-center cursor-pointer space-x-1"
                onClick={() => {
                    setIsCollapsed(!isCollapsed)
                }}
            >
                <ArrowUpDown active={!isCollapsed} />
                <div>
                    <span className="ml-1 font-bold">{tool}</span>
                </div>
            </div>
            <div
                className={classnames(
                    "overflow-hidden",
                    isCollapsed ? "h-0" : ""
                )}
            >
                <div className="ml-1 text-primary-grey-dark">
                    {message}

                    {details.map((d, i) => (
                        <li key={d + i}>
                            <i className="ml-1 text-primary-grey-dark">{d}</i>
                        </li>
                    ))}
                </div>
            </div>
        </>
    )
}

export default BridgeNotFoundItem
