import React from "react"
import classnames from "classnames"

interface BadgeProps {
    profile: "default" | "success" | "error" | "warning" | "info" | "dark"
}

const PROFILE_COLORS = {
    default: {
        backgroundColor: "bg-gray-600",
        textColor: "text-white",
    },
    success: {
        backgroundColor: "bg-green-100",
        textColor: "text-green-600",
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
        backgroundColor: "bg-blue-500",
        textColor: "text-white",
    },
    dark: {
        backgroundColor: "bg-black",
        textColor: "text-white",
    },
}

const Tag: React.FC<BadgeProps> = ({ children, profile }) => {
    const { backgroundColor, textColor } = PROFILE_COLORS[profile]
    return (
        <span
            className={classnames(
                "px-1 py-1 text-xs rounded-md",
                backgroundColor,
                textColor
            )}
        >
            {children}
        </span>
    )
}

export default Tag
