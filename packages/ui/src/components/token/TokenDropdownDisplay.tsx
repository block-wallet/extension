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
                    "flex items-center w-full text-base font-semibold space-x-2"
                )}
            >
                <Spinner size="24" />
                <span className="text-sm">{loadingText}</span>
            </div>
        )
    }

    return selectedToken ? (
        <div className="flex">
            {displayIcon && (
                <TokenLogo
                    logo={selectedToken.logo}
                    name={selectedToken.name}
                    logoSize="small"
                    filled={true}
                    className="mr-2 p-0.5"
                />
            )}
            <span className="flex items-center text-base font-semibold">
                {selectedToken.symbol}
            </span>
        </div>
    ) : (
        <div className="flex flex-col justify-center w-full">
            <div className="text-base font-semibold">Select token</div>
        </div>
    )
}

export default TokenDropdownDisplay
