import { BigNumber } from "ethers"
import { Fragment, FunctionComponent, useState } from "react"

import { useBlankState } from "../context/background/backgroundHooks"
import { useOnMountHistory } from "../context/hooks/useOnMount"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { TokenList, useTokensList } from "../context/hooks/useTokensList"
import { formatUnits } from "@ethersproject/units"
import AnimatedIcon, { AnimatedIconName } from "./AnimatedIcon"

import { Classes } from "../styles/classes"
import plus from "../assets/images/icons/plus.svg"
import unknownTokenIcon from "../assets/images/unknown_token.svg"
import ChevronRightIcon from "./icons/ChevronRightIcon"
import { formatRounded } from "../util/formatRounded"
import { formatCurrency, toCurrencyAmount } from "../util/formatCurrency"
import { ActionButton } from "./button/ActionButton"
import { getValueByKey } from "../util/objectUtils"
import classnames from "classnames"
export type AssetItem = {
    token: Token
    balance: BigNumber
}

export const AssetIcon: FunctionComponent<{
    asset: Partial<Token>
    filled?: boolean
}> = ({ asset, filled }) => (
    <div className={filled ? Classes.roundedFilledIcon : Classes.roundedIcon}>
        {
            <img
                src={asset.logo || unknownTokenIcon}
                onError={(e) => {
                    ;(e.target as any).onerror = null
                    ;(e.target as any).src = unknownTokenIcon
                }}
                alt={asset.symbol || ""}
                className="rounded-full"
            />
        }
    </div>
)

const Asset: FunctionComponent<{
    asset: AssetItem
    pushDeleteTokens: Function
}> = ({ asset, pushDeleteTokens }) => {
    const history: any = useOnMountHistory()
    const { exchangeRates, nativeCurrency, localeInfo } = useBlankState()!

    const tokenPrice = getValueByKey(exchangeRates, asset.token.symbol, 0)

    return (
        <div
            onClick={() =>
                history.push({
                    pathname: `/asset/details`,
                    state: {
                        address: asset.token.address,
                        transitionDirection: "left",
                    },
                })
            }
            className="flex flex-row items-center justify-between px-6 py-5 -ml-6 transition duration-300 hover:bg-primary-100 hover:bg-opacity-50 active:bg-primary-200 active:bg-opacity-50 cursor-pointer"
            style={{ width: "calc(100% + 2 * 1.5rem)" }}
            role="listitem"
            aria-label={asset.token.symbol}
        >
            <div className="flex flex-row items-center">
                <AssetIcon asset={asset.token} />
                <div className="flex flex-col ml-2">
                    <span
                        className="text-sm font-bold"
                        title={`
                                    ${formatUnits(
                                        asset.balance || "0",
                                        asset.token.decimals
                                    )} ${asset.token.symbol}
                                `}
                    >
                        {`
                                    ${formatRounded(
                                        formatUnits(
                                            asset.balance || "0",
                                            asset.token.decimals
                                        ),
                                        4
                                    )}
                                    ${asset.token.symbol}
                                `}
                    </span>
                    <span className="text-xs text-gray-600">
                        {formatCurrency(
                            toCurrencyAmount(
                                asset.balance || BigNumber.from(0),
                                tokenPrice,
                                asset.token.decimals
                            ),
                            {
                                currency: nativeCurrency,
                                locale_info: localeInfo,
                                showSymbol: true,
                            }
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

const SubAssetList: FunctionComponent<{ assets: TokenList }> = ({ assets }) => {
    const state = useBlankState()!

    const isLoading =
        state.isNetworkChanging || state.isRatesChangingAfterNetworkChange

    const [deletedTokens, setDeletedTokens] = useState([] as string[])
    const pushDeleteTokens = (deleteToken: string) => {
        setDeletedTokens([...deletedTokens, deleteToken])
    }

    // the action of delete a token is not sync, we include this blick of code for not showing deleted tokens while they are being deleted.
    const newDeleted: string[] = []
    deletedTokens.forEach((t) => {
        if (assets.map((a) => a.token.address).includes(t)) {
            newDeleted.push(t)
        }
    })
    if (deletedTokens.length !== newDeleted.length) {
        setDeletedTokens(newDeleted)
    }

    const assetsLoadingSkeleton = [...Array(2)].map((x, index) => (
        <div key={index}>
            {index > 0 ? <hr /> : null}

            <div className="flex items-center justify-between py-5">
                <div className="flex items-center space-x-2">
                    <div className="flex justify-center items-center h-9 w-9 rounded-full border">
                        <AnimatedIcon
                            icon={AnimatedIconName.GreyCircleLoadingSkeleton}
                            className={classnames(
                                "w-4 h-4 pointer-events-none",
                                index % 2 === 1 && "rotate-180"
                            )}
                            loop
                        />
                    </div>
                    <div>
                        <AnimatedIcon
                            icon={AnimatedIconName.GreyLineLoadingSkeleton}
                            className="mb-2 h-3 w-16 rotate-180"
                            svgClassName="rounded-md"
                            loop
                        />
                        <AnimatedIcon
                            icon={AnimatedIconName.GreyLineLoadingSkeleton}
                            className="h-3 w-24"
                            svgClassName="rounded-md"
                            loop
                        />
                    </div>
                </div>
                <ChevronRightIcon />
            </div>
        </div>
    ))

    return (
        <div
            className="flex flex-col flex-1 w-full space-y-0"
            role="list"
            aria-label="assets"
        >
            {isLoading
                ? assetsLoadingSkeleton
                : assets
                      .filter((t) => !deletedTokens.includes(t.token.address))
                      .map((a, i) => (
                          <Fragment key={i}>
                              {i > 0 ? <hr /> : null}
                              <Asset
                                  asset={a}
                                  pushDeleteTokens={pushDeleteTokens}
                              />
                          </Fragment>
                      ))}
        </div>
    )
}

const AssetsList = () => {
    const { currentNetworkTokens, nativeToken } = useTokensList()

    const tokens = [nativeToken].concat(currentNetworkTokens)

    // Top spacing for network labels: "pt-6"
    return (
        <div
            className="flex flex-col w-full space-y-4"
            data-testid="assets-list"
        >
            {tokens.length > 9 && (
                <div className="flex flex-col w-full mt-4">
                    <ActionButton
                        icon={plus}
                        label="Add Token"
                        to="/settings/tokens/add"
                    />
                </div>
            )}
            <div className="flex flex-col w-full space-y-1">
                {/* Network label */}
                {/* <span className="text-xs text-gray-500">ETHEREUM</span> */}
                <SubAssetList assets={tokens} />
            </div>
            <div className="flex flex-col w-full space-y-1">
                <ActionButton
                    icon={plus}
                    label="Add Token"
                    to="/settings/tokens/add"
                />
            </div>
        </div>
    )
}

export default AssetsList
