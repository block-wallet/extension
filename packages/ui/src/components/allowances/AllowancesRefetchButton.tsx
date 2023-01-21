import classnames from "classnames"
import { useEffect, useState } from "react"
import Icon, { IconName } from "../ui/Icon"
import OutlinedButton from "../ui/OutlinedButton"

const AllowancesFilterButton = ({
    onClick,
    disabled = false,
}: {
    onClick: () => void
    disabled?: boolean
}) => {
    const [showDisabledAnim, setShowDisabledAnim] = useState(false)

    const onClickHandler = () => {
        if (!disabled) onClick()
        else setShowDisabledAnim(true)
    }

    useEffect(() => {
        if (showDisabledAnim) {
            setTimeout(() => {
                setShowDisabledAnim(false)
            }, 2000)
        }
    }, [showDisabledAnim])

    return (
        <div className="relative text-sm text-primary-300">
            <OutlinedButton
                className={classnames(
                    "w-auto",
                    showDisabledAnim &&
                        "text-red-200 border-red-500 transition-colors animate-[pulse_2s] hover-none"
                )}
                onClick={onClickHandler}
            >
                <Icon name={IconName.REFETCH} />
            </OutlinedButton>
        </div>
    )
}

export default AllowancesFilterButton
