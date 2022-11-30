import { BigNumber } from "ethers"
import { Fragment, FunctionComponent, useState } from "react"
import { useOnMountHistory } from "../context/hooks/useOnMount"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { TokenList, useTokensList } from "../context/hooks/useTokensList"
import { formatUnits } from "@ethersproject/units"

import { Classes } from "../styles/classes"
import plus from "../assets/images/icons/plus.svg"
import unknownTokenIcon from "../assets/images/unknown_token.svg"
import ChevronRightIcon from "./icons/ChevronRightIcon"
import { formatRounded } from "../util/formatRounded"
import { ActionButton } from "./button/ActionButton"
import AssetsLoadingSkeleton from "./skeleton/AssetsLoadingSkeleton"
import useCurrencyFromatter from "../util/hooks/useCurrencyFormatter"
import { isNativeTokenAddress } from "../util/tokenUtils"
import { useBlankState } from "../context/background/backgroundHooks"
import { useExchangeRatesState } from "../context/background/useExchangeRatesState"
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
}> = ({ asset }) => {
    const history: any = useOnMountHistory()
    const formatter = useCurrencyFromatter()
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
                        {formatter.format(
                            asset.balance || BigNumber.from(0),
                            asset.token.symbol,
                            asset.token.decimals,
                            isNativeTokenAddress(asset.token.address)
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
    const {
        state: { isRatesChangingAfterNetworkChange },
    } = useExchangeRatesState()
    const isLoading =
        state.isNetworkChanging || isRatesChangingAfterNetworkChange

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

    return (
        <div
            className="flex flex-col flex-1 w-full space-y-0 hide-scroll"
            role="list"
            aria-label="assets"
        >
            {isLoading ? (
                <AssetsLoadingSkeleton />
            ) : (
                assets
                    .filter((t) => !deletedTokens.includes(t.token.address))
                    .map((a, i) => (
                        <Fragment key={i}>
                            {i > 0 ? <hr /> : null}
                            <Asset
                                asset={a}
                                pushDeleteTokens={pushDeleteTokens}
                            />
                        </Fragment>
                    ))
            )}
        </div>
    )
}

const AddTokenButton = () => {
    return (
        <div className="flex flex-col w-full space-y-1 py-2 flex px-6">
            <ActionButton
                icon={plus}
                label="Add Token"
                to="/settings/tokens/add"
            />
        </div>
    )
}

const AssetsList = () => {
    const { currentNetworkTokens, nativeToken } = useTokensList()

    const tokens = [nativeToken].concat(currentNetworkTokens)

    const addTokenTop = tokens.length > 5

    return (
        <div
            className="flex flex-col w-full space-y-4 justify-between h-full"
            data-testid="assets-list"
            style={{ height: 450 }}
        >
            {addTokenTop && <AddTokenButton />}
            <div className="flex flex-col w-full space-y-1 h-full overflow-x-hidden overflow-y-auto hide-scroll px-6">
                {/* Network label */}
                <SubAssetList assets={tokens} />
            </div>
            {!addTokenTop && <AddTokenButton />}
        </div>
    )
}

export default AssetsList
