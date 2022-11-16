import { ReactNode, useState } from "react"
import classnames from "classnames"

type ExpandableTextProps = {
    children: string | ReactNode
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
            title={typeof children === "string" ? children : undefined}
        >
            {children}
        </p>
    )
}

export default ExpandableText
