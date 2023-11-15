import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits } from "ethers/lib/utils"
import { FC } from "react"
import { formatRounded } from "../../util/formatRounded"
import useCurrencyFromatter from "../../util/hooks/useCurrencyFormatter"
import WarningDialog from "../dialog/WarningDialog"
import { BasicToken } from "@block-wallet/background/utils/swaps/1inch"

interface HighPriceImpactDialogProps {
    onClose: () => void
    isOpen: boolean
    priceImpactPercentage: number | undefined
    fromToken: { amount: BigNumber; token: BasicToken }
    toToken: { amount: BigNumber; token: BasicToken }
}
const UNABLE_TO_CALCULATE_PRICE_TITLE = "Unable to calculate price impact"
const UNABLE_TO_CALCULATE_PRICE_MESSAGE =
    "Please review the rates of your swap to avoid potential losses."

const HIGH_PRICE_IMPACT_TITLE = "High price impact!"

const HighPriceImpactExplained: FC<
    Pick<
        HighPriceImpactDialogProps,
        "fromToken" | "toToken" | "priceImpactPercentage"
    >
> = ({ fromToken, toToken, priceImpactPercentage }) => {
    const { format } = useCurrencyFromatter()
    const formatToken = (t: BasicToken, amount: BigNumber): string => {
        return `${formatRounded(formatUnits(amount || "0", t.decimals), 5)} ${
            t.symbol
        }`
    }
    return (
        <div className="flex flex-col space-y-3">
            Warning! We detected a {(priceImpactPercentage! * 100).toFixed(2)}%
            difference in the values you are about to swap.
            <div className="flex flex-col space-y-2 text-left mt-2">
                <div>
                    <span className="font-semibold text-primary-black-default">
                        You pay
                    </span>
                    <br />
                    {`${formatToken(fromToken.token, fromToken.amount)} ~=
                    ${format(
                        fromToken.amount,
                        fromToken.token.symbol,
                        fromToken.token.decimals
                    )}`}
                </div>
                <div className="mt-2">
                    <span className="font-semibold text-primary-black-default">
                        You get
                    </span>
                    <br />
                    {`${formatToken(
                        toToken.token,
                        toToken.amount
                    )} ~=   ${format(
                        toToken.amount,
                        toToken.token.symbol,
                        toToken.token.decimals
                    )}`}
                </div>
            </div>
        </div>
    )
}

const PriceImpactDialog: FC<HighPriceImpactDialogProps> = ({
    isOpen,
    onClose,
    priceImpactPercentage,
    fromToken,
    toToken,
}) => {
    let title: string = UNABLE_TO_CALCULATE_PRICE_TITLE
    let message: React.ReactElement | string = UNABLE_TO_CALCULATE_PRICE_MESSAGE
    if (priceImpactPercentage) {
        title = HIGH_PRICE_IMPACT_TITLE
        message = (
            <HighPriceImpactExplained
                fromToken={fromToken}
                toToken={toToken}
                priceImpactPercentage={priceImpactPercentage}
            />
        )
    }
    return (
        <WarningDialog
            open={isOpen}
            message={message}
            title={title}
            onDone={onClose}
        />
    )
}

export default PriceImpactDialog
