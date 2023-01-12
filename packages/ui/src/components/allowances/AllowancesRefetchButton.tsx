import { useEffect, useState } from "react"
import Icon, { IconName } from "../ui/Icon"
import OutlinedButton from "../ui/OutlinedButton"

const AllowancesFilterButton = ({ onClick }: { onClick: () => void }) => {
    const [isRefetching, setIsRefetching] = useState(false)

    const onCLickHandler = () => {
        setIsRefetching(true)
        onClick()
    }

    useEffect(() => {
        if (isRefetching) {
            setTimeout(() => {
                setIsRefetching(false)
            }, 1000)
        }
    }, [isRefetching])

    return (
        <div className="relative text-sm text-primary-300">
            <OutlinedButton className="w-auto" onClick={onCLickHandler}>
                <Icon
                    name={IconName.REFETCH}
                    className={
                        isRefetching
                            ? "text-primary-300 transition-colors animate-[spin_1s]"
                            : ""
                    }
                />
            </OutlinedButton>
        </div>
    )
}

export default AllowancesFilterButton
