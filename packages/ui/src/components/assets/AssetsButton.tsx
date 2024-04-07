import classnames from "classnames"
import OutlinedButton from "../ui/OutlinedButton"
import { FC } from "react"

const AssetsButton: FC<{
    onClick: () => void
    imgClassName?: string
    title?: string
    icon?: string
    disabled?: boolean
}> = ({
    onClick,
    title = "",
    imgClassName = "",
    icon = "",
    disabled = false,
}) => {
    return (
        <div
            className="relative text-sm text-primary-blue-default h-8"
            title={title}
        >
            <OutlinedButton
                className={classnames(
                    "w-auto h-10",
                    disabled && "opacity-50 pointer-events-none bg-gray-400"
                )}
                onClick={onClick}
                disabled={disabled}
            >
                <img
                    src={icon}
                    alt="icon"
                    className={imgClassName ?? "w-5 h-5"}
                />
            </OutlinedButton>
        </div>
    )
}

export default AssetsButton
