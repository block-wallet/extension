import React, { FunctionComponent } from "react"
import { classnames } from "../../styles/classes"

const ErrorMessage: FunctionComponent<{
    children?: React.ReactNode
    className?: string | undefined
}> = ({ children = "", className }) => {
    return (
        <span
            className={classnames(
                "text-red-500 text-xs break-words",
                children ? "" : "hidden",
                className
            )}
        >
            {children}
        </span>
    )
}

export default ErrorMessage
