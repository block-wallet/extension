import React from "react"
import classnames from "classnames"
import Icon, { IconName } from "./Icon"
import Typography, { TypographyType } from "./Typography"
interface EmptyStateProps {
    iconName?: IconName
    className: string
    title: string
}
const EmptyState: React.FC<EmptyStateProps> = ({
    iconName,
    title,
    children,
    className,
}) => {
    return (
        <div
            className={classnames(
                "items-center flex flex-col space-y-1 text-center",
                className || ""
            )}
        >
            <Icon size="xl" name={iconName || IconName.EMPTY_DRAWER} />
            <Typography type={TypographyType.TITLE}>{title}</Typography>
            {children}
        </div>
    )
}

export default EmptyState
