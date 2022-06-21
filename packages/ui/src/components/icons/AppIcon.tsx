import classnames from "classnames"
import React from "react"

interface AppIconProps {
    size: number
    iconURL: string
    iconSize?: number
    title?: string
    background?: boolean
}

const AppIcon = ({
    size,
    iconURL,
    iconSize,
    background = true,
    title,
}: AppIconProps) => (
    <div
        className={classnames(
            "flex flex-row items-center justify-center rounded-full",
            `w-${size} h-${size}`,
            background && "bg-primary-100"
        )}
    >
        {iconURL ? (
            <img
                alt="icon"
                src={iconURL}
                draggable={false}
                className={iconSize ? `max-h-${iconSize}` : `max-h-${size - 3}`}
                title={title}
            />
        ) : null}
    </div>
)

export default AppIcon
