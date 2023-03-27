import { FC } from "react"
import classnames from "classnames"

interface RoundedIconButtonProps {
    Icon: React.ElementType
    disabled: boolean
    children: React.ReactNode
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
                    disabled ? "bg-gray-300" : "bg-primary-blue-default"
                )}
                style={{ transform: "scaleY(-1)" }}
            >
                <Icon />
            </div>
            <span className="text-[13px] font-medium">{children}</span>
        </>
    )
}

export default RoundedIconButton
