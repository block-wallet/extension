import classnames from "classnames"
import Icon, { IconName } from "../ui/Icon"

interface Props {
    value: string
    className?: string
}

const RefreshLabel: React.FC<Props> = ({ value, className }) => {
    return (
        <div
            className={classnames(
                "flex flex-row items-center space-x-2",
                className
            )}
        >
            <Icon name={IconName.CLOCK} />
            <span className="text-xs text-primary-grey-dark">
                Refreshes in {value}
            </span>
        </div>
    )
}

export default RefreshLabel
