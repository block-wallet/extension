import React, { FC } from "react"
import classnames from "classnames"

interface RoundedIconButtonProps {
    Icon: React.ElementType
    disabled: boolean
}

const RoundedIconButton: FC<RoundedIconButtonProps> = ({
    children,
    disabled,
    Icon,
}) => {
    return (
        <>
            <div
                className={classnames(
                    "w-8 h-8 overflow-hidden transition duration-300 rounded-full group-hover:opacity-75",
                    disabled ? "bg-gray-300" : "bg-primary-300"
                )}
                style={{ transform: "scaleY(-1)" }}
            >
                <Icon />
            </div>
            <span className="text-xs font-medium">{children}</span>
        </>
    )
}

export default RoundedIconButton
