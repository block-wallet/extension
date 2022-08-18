import { useOnMountHistory } from "../../context/hooks/useOnMount"
import ClickableText from "../button/ClickableText"
import classnames from "classnames"
interface WithdrawReminderProps {
    className?: string
}

//Component
const MissingDepositOrWithdrawTip = (props: WithdrawReminderProps) => {
    const className = props.className
    const history = useOnMountHistory()

    const navigateToPrivacy = () => {
        history.push({
            pathname: "/settings/privacy",
            state: {
                reconstructTornadoNotes: true,
            },
        })
    }

    return (
        <div className={classnames("flex flex-col space-y-1", className)}>
            <span className="text-xs text-gray-500">Missing an item?</span>
            <span className="text-xs text-gray-500">
                Try Reconstructing Tornado Notes{" "}
                <ClickableText onClick={navigateToPrivacy}>here</ClickableText>
            </span>
        </div>
    )
}

export default MissingDepositOrWithdrawTip
