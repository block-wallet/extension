import { FC } from "react"
import TokenLogo from "../token/TokenLogo"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"

interface TokenDropdownDisplayProps {
    selectedToken?: Token
    displayIcon?: boolean
}

const TokenDropdownDisplay: FC<TokenDropdownDisplayProps> = ({
    selectedToken,
    displayIcon,
}) => {
    return selectedToken ? (
        <div className="flex flex-row flex-grow justify-between items-center">
            {displayIcon && (
                <TokenLogo
                    logo={selectedToken.logo}
                    name={selectedToken.name}
                    className="mr-2"
                />
            )}
            <div className="flex flex-grow justify-between space-x-1">
                <div className="flex flex-col justify-center">
                    <span className="text-base font-semibold">
                        {selectedToken.symbol}
                    </span>
                </div>
            </div>
        </div>
    ) : (
        <div className="flex flex-col justify-center w-full">
            <div className="text-base font-semibold">Select token</div>
        </div>
    )
}

export default TokenDropdownDisplay
