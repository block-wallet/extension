import { FC } from "react"
import classnames from "classnames"
import AnimatedIcon, { AnimatedIconName } from "../AnimatedIcon"

interface RoundedIconButtonProps {
    Icon: React.ElementType
    disabled: boolean
    children: React.ReactNode
    isLoading?: boolean
}

export const RoundedLoadingButton = () => {
    return (
        <div className="flex flex-row items-center justify-center w-full h-full">
            <AnimatedIcon
                icon={AnimatedIconName.BlueCircleLoadingSkeleton}
                className="w-4 h-4 pointer-events-none rotate-180"
            />
        </div>
    )
}

const RoundedIconButton: FC<RoundedIconButtonProps> = ({
    children,
    disabled,
    Icon,
    isLoading,
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
                {isLoading ? <RoundedLoadingButton /> : <Icon />}
            </div>
            <span className="text-[13px] font-medium">{children}</span>
        </>
    )
}

export default RoundedIconButton
