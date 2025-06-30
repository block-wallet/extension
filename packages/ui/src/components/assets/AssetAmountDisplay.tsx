import { FC } from "react"
import unknownTokenIcon from "../../assets/images/unknown_token.svg"
import { BigNumber } from "@ethersproject/bignumber"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { formatRounded } from "../../util/formatRounded"
import { formatUnits } from "@ethersproject/units"
import { formatNumberLength } from "../../util/formatNumberLength"

interface AssetAmountComponentProps {
    asset: Token
    amount?: BigNumber
}

const AssetAmountDisplay: FC<AssetAmountComponentProps> = ({
    asset,
    amount,
}) => {
    const amountString = formatRounded(
        formatUnits(amount || 0, asset.decimals),
        11
    )

    return (
        <div className="flex flex-row items-center w-full p-4 rounded-lg bg-gray-50 dark:bg-gray-800 transition-colors duration-200">
            <span className="flex items-center justify-center !w-6 !h-6 rounded-full">
                <img
                    src={asset.logo || unknownTokenIcon}
                    alt={asset.name}
                    className="rounded-full"
                />
            </span>
            <span
                className="text-base truncate font-semibold ml-2 text-gray-900 dark:text-gray-100"
                title={asset.symbol}
            >
                {asset.symbol}
            </span>
            {amount && (
                <div
                    className="text-base truncate font-semibold !ml-auto text-gray-900 dark:text-gray-100"
                    title={amountString}
                >
                    {formatNumberLength(amountString, 12)}
                </div>
            )}
        </div>
    )
}

export default AssetAmountDisplay
