import { ReactNode } from "react"
import classnames from "classnames"

const CodeBlock = ({
    className,
    children,
}: {
    className?: string
    children: ReactNode | string
}) => {
    return (
        <pre
            className={classnames(
                "text-gray-600 bg-gray-100 border border-gray-300 overflow-auto rounded-md p-2 whitespace-pre-line break-all",
                className
            )}
        >
            {children}
        </pre>
    )
}

export default CodeBlock
