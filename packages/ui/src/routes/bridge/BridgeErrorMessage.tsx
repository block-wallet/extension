import { FC } from "react"
import ClickableText from "../../components/button/ClickableText"
import ErrorMessage from "../../components/error/ErrorMessage"

export enum BridgeErrorType {
    QUOTE_NOT_FOUND = "QUOTE_NOT_FOUND",
    INSUFFICIENT_BALANCE_TO_COVER_FEES = "INSUFFICIENT_BALANCE_TO_COVER_FEES",
    OTHER = "OTHER",
}

interface BridgeErrorMessageProps {
    type: BridgeErrorType
    onClickDetails: (type: string) => void
    className?: string
}

const ERROR_BY_TYPE = {
    [BridgeErrorType.INSUFFICIENT_BALANCE_TO_COVER_FEES]:
        "You don't have enough balance to cover the bridge fees.",
    [BridgeErrorType.QUOTE_NOT_FOUND]: "Unable to generate a valid quote.",
    [BridgeErrorType.OTHER]: "Something went wrong. Please try again.",
}

const BridgeErrorMessage: FC<BridgeErrorMessageProps> = ({
    onClickDetails,
    type,
    className,
}) => {
    let content = null
    if (type === BridgeErrorType.QUOTE_NOT_FOUND) {
        content = (
            <span>
                <ClickableText
                    onClick={() => onClickDetails(type)}
                    className="!break-word !whitespace-normal"
                >
                    Check the details
                </ClickableText>{" "}
                and try again.
            </span>
        )
    }
    if (type === BridgeErrorType.INSUFFICIENT_BALANCE_TO_COVER_FEES) {
        content = (
            <ClickableText onClick={() => onClickDetails(type)}>
                View details
            </ClickableText>
        )
    }

    const message = ERROR_BY_TYPE[type]

    return (
        <ErrorMessage className={className}>
            {message} {content}
        </ErrorMessage>
    )
}

export default BridgeErrorMessage
