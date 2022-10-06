import { FunctionComponent } from "react"
import { classnames } from "../../styles/classes"

const ErrorMessage: FunctionComponent<{
    error?: string | undefined
    className?: string | undefined
}> = ({ error = "", className }) => {
    return (
        <span
            className={classnames(
                "text-red-500 text-xs break-words",
                error ? "" : "hidden",
                className
            )}
        >
            {error || <>&nbsp;</>}
        </span>
    )
}

export default ErrorMessage
