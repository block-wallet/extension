import { FC } from "react"
import TokenLogo from "../token/TokenLogo"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { formatName } from "../../util/formatAccount"

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
                    <div className="text-base font-semibold">
                        <span className="flex">{selectedToken.symbol}</span>
                        <span className="font-normal text-xs">
                            {formatName(selectedToken.name.toUpperCase(), 16)}
                        </span>
                    </div>
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
