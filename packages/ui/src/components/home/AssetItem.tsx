import { FC } from "react"
import { BigNumber } from "@ethersproject/bignumber"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import ChevronRightIcon from "../icons/ChevronRightIcon"
import useCurrencyFromatter from "../../util/hooks/useCurrencyFormatter"
import { isNativeTokenAddress } from "../../util/tokenUtils"
import { useExchangeRatesState } from "../../context/background/useExchangeRatesState"
import AnimatedIcon, { AnimatedIconName } from "../AnimatedIcon"
import { formatAssetBalance } from "../../util/balance"
import TokenLogo from "../token/TokenLogo"
import { Classes } from "../../styles"

export type AsssetData = {
    token: Token
    balance: BigNumber
}

const AssetItem: FC<{
    asset: AsssetData
    pushDeleteTokens: Function
}> = ({ asset: { balance, token } }) => {
    const history: any = useOnMountHistory()
    const formatter = useCurrencyFromatter()
    const {
        state: { isRatesChangingAfterNetworkChange },
    } = useExchangeRatesState()

    return (
        <div
            onClick={() =>
                history.push({
                    pathname: `/asset/details`,
                    state: {
                        address: token.address,
                        transitionDirection: "left",
                    },
                })
            }
            className="flex flex-row items-center justify-between px-6 py-5 -ml-6 transition duration-300 hover:bg-primary-100 hover:bg-opacity-50 active:bg-primary-200 active:bg-opacity-50 cursor-pointer"
            style={{ width: "calc(100% + 2 * 1.5rem)" }}
            role="listitem"
            aria-label={token.symbol}
        >
            <div className="flex flex-row items-center">
                <TokenLogo
                    logo={token.logo}
                    name={token.name}
                    className={Classes.roundedIcon}
                />
                <div className="flex flex-col ml-2">
                    <span
                        className="text-sm font-bold"
                        title={formatAssetBalance(balance, token, {
                            rounded: false,
                            dislpaySymbol: true,
                        })}
                    >
                        {formatAssetBalance(balance, token, {
                            rounded: true,
                            dislpaySymbol: true,
                            roundedDecimals: 4,
                        })}
                    </span>
                    <span className="text-xs text-gray-600">
                        {isRatesChangingAfterNetworkChange ? (
                            <AnimatedIcon
                                icon={AnimatedIconName.BlueLineLoadingSkeleton}
                                className="w-16 h-4 pointer-events-none rotate-180"
                                svgClassName="rounded-md"
                            />
                        ) : (
                            formatter.format(
                                balance || BigNumber.from(0),
                                token.symbol,
                                token.decimals,
                                isNativeTokenAddress(token.address)
                            )
                        )}
                    </span>
                </div>
            </div>
            <div className="flex flex-col items-end">
                <ChevronRightIcon />
            </div>
        </div>
    )
}

export default AssetItem
