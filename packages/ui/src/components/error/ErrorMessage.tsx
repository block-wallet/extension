import { FunctionComponent } from "react"
import { classnames } from "../../styles/classes"

const ErrorMessage: FunctionComponent<{
    error?: string | undefined
}> = ({ error = "" }) => {
    return (
        <span
            className={classnames(
                "text-red-500 text-xs break-words",
                error ? "" : "hidden"
            )}
            title={error || ""}
        >
            {error || <>&nbsp;</>}
        </span>
    )
}

export default ErrorMessage
