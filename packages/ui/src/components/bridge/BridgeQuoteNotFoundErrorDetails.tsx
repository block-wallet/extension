import { BridgeError } from "../../components/transactions/BridgeNotFoundQuoteDetails"
import BridgeNotFoundItem from "../../components/bridge/BridgeNotFoundItem"

type BridgeErrorSummary = {
    message: string
    code: string
    details: string[]
}

const BridgeErrorDisplay = ({
    tool,
    bridgeError,
}: {
    tool: string
    bridgeError: BridgeError[]
}) => {
    let errors = new Map<string, BridgeErrorSummary>()

    bridgeError.map((value) => {
        if (errors.has(value.code)) {
            errors
                .get(value.code)
                ?.details.push(value.fromToken + " -> " + value.toToken)
        } else {
            errors.set(value.code, {
                message: value.message,
                code: value.code,
                details: [value.fromToken + " -> " + value.toToken],
            })
        }
    })

    return (
        <div>
            <span className="text-xs text-gray-500 font-bold">{tool}</span>
            {Array.from(errors.keys()).map((code) => {
                const errorSummary = errors.get(code)
                return (
                    errorSummary && (
                        <div className="flex flex-col">
                            <BridgeNotFoundItem
                                tool={errorSummary.code}
                                details={errorSummary.details}
                                message={errorSummary.message}
                            />
                        </div>
                    )
                )
            })}
        </div>
    )
}

export default BridgeErrorDisplay
