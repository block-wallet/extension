import classnames from "classnames"
import Icon, { IconName } from "../ui/Icon"
import OutlinedButton from "../ui/OutlinedButton"

const AllowancesFilterButton = ({ onClick }: { onClick: () => void }) => {
    return (
        <div
            className="relative text-sm text-primary-blue-default"
            title={"Refresh Allowances"}
        >
            <OutlinedButton className={classnames("w-auto")} onClick={onClick}>
                <Icon name={IconName.REFETCH} />
            </OutlinedButton>
        </div>
    )
}

export default AllowancesFilterButton
