import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits } from "ethers/lib/utils"
import { FC } from "react"
import { AiOutlineWarning } from "react-icons/ai"
import { formatRounded } from "../../util/formatRounded"
import useCurrencyFromatter from "../../util/hooks/useCurrencyFormatter"
import MessageDialog from "../dialog/MessageDialog"
import Divider from "../Divider"
import { BasicToken } from "@block-wallet/background/utils/swaps/1inch"

interface HighPriceImpactDialogProps {
    onClose: () => void
    isOpen: boolean
    priceImpactPercentage: number | undefined
    fromToken: { amount: BigNumber; token: BasicToken }
    toToken: { amount: BigNumber; token: BasicToken }
}
const UNABLE_TO_CALCULATE_PRICE_TITLE = "Unable to calculate price impact"

const UnableToCalculateMessage: FC = () => (
    <div className="flex flex-col space-y-4 text-center">
        <div className="flex justify-center">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-yellow-500 dark:border-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 dark:text-yellow-400 font-bold text-sm">!</span>
                </div>
            </div>
        </div>

        <div className="space-y-2">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                We're unable to determine the exact price impact for this swap.
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <span className="font-medium">Recommendation:</span> Please review the exchange rates carefully to avoid potential losses.
            </p>
        </div>
    </div>
)

const HIGH_PRICE_IMPACT_TITLE = "High price impact!"

const HighPriceImpactExplained: FC<
    Pick<
        HighPriceImpactDialogProps,
        "fromToken" | "toToken" | "priceImpactPercentage"
    >
> = ({ fromToken, toToken, priceImpactPercentage }) => {
    const { format } = useCurrencyFromatter()
    const formatToken = (t: BasicToken, amount: BigNumber): string => {
        return `${formatRounded(formatUnits(amount || "0", t.decimals), 4)} ${t.symbol}`
    }

    return (
        <div className="flex flex-col space-y-4">
            {/* Price Impact Warning Banner */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-700/50 rounded-lg p-3">
                <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                        Price Impact:
                        <span className="font-bold text-red-800 dark:text-red-200 ml-1">
                            {(priceImpactPercentage! * 100).toFixed(2)}%
                        </span>
                    </span>
                </div>
            </div>

            {/* Warning Message */}
            <p className="text-center text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                We detected a significant difference in the values you are about to swap. Please review carefully.
            </p>

            {/* Token Exchange Details */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-3">
                {/* From Token */}
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            You Pay
                        </span>
                        <div className="mt-1">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {formatToken(fromToken.token, fromToken.amount)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                ≈ {format(
                                    fromToken.amount,
                                    fromToken.token.symbol,
                                    fromToken.token.decimals
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Exchange Arrow */}
                <div className="flex justify-center">
                    <div className="w-6 h-0.5 bg-gray-300 dark:bg-gray-600 rounded-full relative">
                        <div className="absolute -right-1 -top-1 w-2 h-2 border-t border-r border-gray-400 dark:border-gray-500 transform rotate-45"></div>
                    </div>
                </div>

                {/* To Token */}
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            You Get
                        </span>
                        <div className="mt-1">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {formatToken(toToken.token, toToken.amount)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                ≈ {format(
                                    toToken.amount,
                                    toToken.token.symbol,
                                    toToken.token.decimals
                                )}
                            </div>
                        </div>
                    </div>
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
    let message: React.ReactElement = <UnableToCalculateMessage />

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
        <MessageDialog
            open={isOpen}
            title={title}
            message={message}
            onClickOutside={onClose}
            header={
                <AiOutlineWarning className="w-16 h-16 mb-2 block m-auto text-yellow-500 dark:text-yellow-400" />
            }
            footer={
                <>
                    <div className="-mx-6">
                        <Divider />
                    </div>
                    <div className="p-1 w-full flex">
                        <button
                            className="w-full bg-primary-blue-default hover:bg-primary-blue-hover text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 shadow-sm border-2 border-primary-blue-default hover:border-primary-blue-hover transform active:scale-95 mt-4"
                            onClick={onClose}
                        >
                            OK
                        </button>
                    </div>
                </>
            }
        />
    )
}

export default PriceImpactDialog
