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
                "text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-auto rounded-md p-2 whitespace-pre-line break-all",
                className
            )}
        >
            {children}
        </pre>
    )
}

export default CodeBlock
