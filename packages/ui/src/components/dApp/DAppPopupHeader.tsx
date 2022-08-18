import PopupHeader, { PopupHeaderProps } from "../popup/PopupHeader"
import classnames from "classnames"
import NetworkDisplayBadge from "../chain/NetworkDisplayBadge"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { AiFillInfoCircle } from "react-icons/ai"
import Tooltip from "../label/Tooltip"

interface Props extends PopupHeaderProps {
    showNetworkIndicator?: boolean
    requestCount?: number
}
const DAppPopupHeader: React.FC<Props> = ({
    className,
    showNetworkIndicator = true,
    requestCount = 1,
    children,
    ...rest
}) => {
    const network = useSelectedNetwork()
    return (
        <PopupHeader
            backButton={false}
            close={false}
            className={classnames(
                showNetworkIndicator && "justify-between",
                showNetworkIndicator && requestCount > 1 && "flex space-x-1",
                "py-2.5 px-6",
                className
            )}
            {...rest}
        >
            {children}
            {requestCount > 1 && (
                <div className="group relative flex-1">
                    <AiFillInfoCircle
                        size={26}
                        className="pl-2 text-primary-200 cursor-pointer hover:text-primary-300"
                    />
                    <Tooltip
                        content={`${requestCount - 1} more ${
                            requestCount > 2 ? "requests" : "request"
                        }`}
                    />
                </div>
            )}
            {showNetworkIndicator && (
                <NetworkDisplayBadge network={network} truncate />
            )}
        </PopupHeader>
    )
}

export default DAppPopupHeader
