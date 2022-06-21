import React from "react"
import classnames from "classnames"

const EndLabel = ({
    label,
    children,
    className,
}: {
    label: string
    children: React.ReactNode
    className?: string
}) => (
    <div className="flex flex-row relative w-full">
        {children}
        <div
            className={classnames(
                "absolute inset-y-0 right-8 flex items-center",
                className
            )}
        >
            <span className="text-gray-500 text-sm">{label}</span>
        </div>
    </div>
)

export default EndLabel
