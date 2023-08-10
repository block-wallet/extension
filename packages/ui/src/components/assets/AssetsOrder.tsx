import classnames from "classnames"
import OutlinedButton from "../ui/OutlinedButton"
import order from "../../assets/images/icons/order.svg"
import { FC } from "react"

const AssetsOrder: FC<{ onClick: () => void; imgClassName?: string }> = ({
    onClick,
    imgClassName,
}) => {
    return (
        <div
            className="relative text-sm text-primary-blue-default"
            title={"Refresh Allowances"}
        >
            <OutlinedButton className={classnames("w-auto")} onClick={onClick}>
                <img
                    src={order}
                    alt="icon"
                    className={imgClassName ?? "w-5 h-5"}
                />
            </OutlinedButton>
        </div>
    )
}

export default AssetsOrder
