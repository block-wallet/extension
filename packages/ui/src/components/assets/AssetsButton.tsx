import classnames from "classnames"
import OutlinedButton from "../ui/OutlinedButton"
import { FC } from "react"

const AssetsButton: FC<{
    onClick: () => void
    imgClassName?: string
    title?: string
    icon?: string
}> = ({ onClick, title = "", imgClassName = "", icon = "" }) => {
    return (
        <div
            className="relative text-sm text-primary-blue-default h-8"
            title={title}
        >
            <OutlinedButton
                className={classnames("w-auto h-10")}
                onClick={onClick}
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
