import { FC } from "react"
import TokenLogo from "../token/TokenLogo"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import classnames from "classnames"
import Spinner from "../spinner/Spinner"

interface TokenDropdownDisplayProps {
    selectedToken?: Token
    displayIcon?: boolean
    isLoading?: boolean
    loadingText?: string
}

const TokenDropdownDisplay: FC<TokenDropdownDisplayProps> = ({
    selectedToken,
    displayIcon,
    loadingText = "",
    isLoading,
}) => {
    if (isLoading) {
        return (
            <div
                className={classnames(
                    "flex items-center w-full text-base font-semibold space-x-2 text-gray-900 dark:text-gray-100"
                )}
            >
                <Spinner size="24" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{loadingText}</span>
            </div>
        )
    }

    return selectedToken ? (
        <div className="flex text-base font-semibold text-gray-900 dark:text-gray-100">
            {displayIcon && (
                <TokenLogo
                    logo={selectedToken.logo}
                    name={selectedToken.name}
                    logoSize="small"
                    filled={false}
                    className="mr-2 p-0.5"
                />
            )}
            <span className="flex items-center text-base font-semibold text-gray-900 dark:text-gray-100">
                {selectedToken.symbol}
            </span>
        </div>
    ) : (
        <div className="flex flex-col justify-center w-full">
            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">Select token</div>
        </div>
    )
}

export default TokenDropdownDisplay
