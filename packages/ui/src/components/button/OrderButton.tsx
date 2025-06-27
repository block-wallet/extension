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
            className="relative text-sm text-primary-blue-default dark:text-primary-blue-400"
            title={title}
        >
            <OutlinedButton
                onClick={onClick}
                className={buttonClassName}
            >
                <Icon name={IconName.ORDER} profile="default" size="lg" />
            </OutlinedButton>
        </div>
    )
}

export default OrderButton
