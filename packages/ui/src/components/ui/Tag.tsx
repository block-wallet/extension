import { FC, PropsWithChildren } from "react"
import classnames from "classnames"

interface BadgeProps {
    profile: "default" | "success" | "error" | "warning" | "info" | "dark"
    size?: "sm" | "md"
}

const PROFILE_COLORS = {
    default: {
        backgroundColor: "bg-gray-600",
        textColor: "text-white",
    },
    success: {
        backgroundColor: "bg-secondary-green-default",
        textColor: "text-white",
        borderColor: "border-green-300",
    },
    error: {
        backgroundColor: "bg-red-600",
        textColor: "text-white",
    },
    warning: {
        backgroundColor: "text-yellow-600",
        textColor: "bg-yellow-100",
    },
    info: {
        backgroundColor: "bg-primary-blue-default",
        textColor: "text-white",
    },
    dark: {
        backgroundColor: "bg-primary-blue-default",
        textColor: "text-white",
    },
}

const Tag: FC<PropsWithChildren<BadgeProps>> = ({
    children,
    profile,
    size,
}) => {
    const { backgroundColor, textColor } = PROFILE_COLORS[profile]
    const tagSize = size || "md"
    return (
        <span
            className={classnames(
                "px-1.5 py-0.5 rounded-sm",
                tagSize === "sm" ? "text-xxs" : "text-xs",
                backgroundColor,
                textColor
            )}
        >
            {children}
        </span>
    )
}

export default Tag
