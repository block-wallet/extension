import { useState } from "react"
import classnames from "classnames"

type ExpandableTextProps = {
    children: string
    className: string
}

const ExpandableText = ({ children, className }: ExpandableTextProps) => {
    const [isExpended, setIsExpended] = useState(() => false)

    return (
        <p
            className={classnames(
                className,
                "cursor-pointer",
                isExpended ? "break-words" : "truncate"
            )}
            onClick={(_) => {
                setIsExpended(!isExpended)
            }}
            title={children}
        >
            {children}
        </p>
    )
}

export default ExpandableText
