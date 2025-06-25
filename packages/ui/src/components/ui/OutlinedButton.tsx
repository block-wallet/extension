import { FC, PropsWithChildren } from "react"
import classnames from "classnames"
interface OutlinedButtonProps {
    onClick?: (e: any) => void
    className?: string
    disabled?: boolean
    title?: string
}
const OutlinedButton: FC<PropsWithChildren<OutlinedButtonProps>> = ({
    onClick,
    className = "",
    children,
    disabled = false,
    title,
}) => {
    return (
        <button
            className={classnames(
                "flex flex-row items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-gray-900 dark:hover:border-gray-300 justify-between",
                "h-10 rounded-lg text-sm font-semibold text-gray-900 dark:text-gray-100 w-10 p-2.5",
                "transition-colors duration-200",
                onClick && "cursor-pointer",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
            onClick={onClick}
            disabled={disabled}
            {...(title ? { title: title } : {})}
        >
            {children}
        </button>
    )
}
export default OutlinedButton
