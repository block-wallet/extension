import classnames from "classnames"
import OutlinedButton from "../ui/OutlinedButton"
import { FC } from "react"
import Icon, { IconName } from "../ui/Icon"

const OrderButton: FC<{
    onClick: () => void
    title: string
    buttonClassName?: string
}> = ({ onClick, title, buttonClassName }) => {
    return (
        <div
            className="relative text-sm text-primary-blue-default"
            title={title}
        >
            <OutlinedButton
                className={classnames(buttonClassName, "w-auto")}
                onClick={onClick}
            >
                <Icon name={IconName.ORDER} profile="default" />
            </OutlinedButton>
        </div>
    )
}

export default OrderButton
