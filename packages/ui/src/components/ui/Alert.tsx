import classnames from "classnames"
import { PropsWithChildren } from "react"
interface AlertProps {
    type: "error" | "warn" | "info"
    className?: string
    onClick?: () => any
}

const CLASSES_BY_TYPE = {
    error: {
        background: "bg-red-300",
        text: "text-red-900",
    },
    warn: {
        background: "bg-yellow-100",
        text: "text-yellow-600",
    },
    info: {
        background: "bg-blue-300",
        text: "text-blue-900",
    },
}
const Alert: React.FC<PropsWithChildren<AlertProps>> = ({
    type,
    onClick,
    children,
    className,
}) => {
    const classes = CLASSES_BY_TYPE[type]
    return (
        <div
            onClick={onClick}
            className={classnames(
                classes.background,
                "opacity-90 rounded-md w-full p-4 flex space-x-2 items-center font-bold justify-center",
                className
            )}
        >
            <span className={classnames(classes.text, "text-xs")}>
                {children}
            </span>
        </div>
    )
}

export default Alert
