import classnames from "classnames"
import { FunctionComponent } from "react"
import { Classes } from "../styles"

const Placeholder: FunctionComponent<{
    className?: string
    dark?: boolean
}> = ({ className, dark = false }) => {
    return (
        <div
            className={classnames(
                Classes.placeholder,
                className,
                dark ? "bg-gray-800" : "bg-gray-200"
            )}
        />
    )
}

export default Placeholder
