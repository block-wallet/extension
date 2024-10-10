import { Fragment, FunctionComponent, useState, useEffect, useRef } from "react"
///Hooks
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import {
    TokenList,
    useTokenListWithNativeToken,
} from "../../context/hooks/useTokensList"
import useCurrencyFromatter from "../../util/hooks/useCurrencyFormatter"
import useTokenSearch from "../../util/hooks/token/useTokenSearch"

///Icons + Classes
import { Classes, classnames } from "../../styles/classes"
import plus from "../../assets/images/icons/plus.svg"
import unknownTokenIcon from "../../assets/images/unknown_token.svg"
import ChevronRightIcon from "../icons/ChevronRightIcon"
import order from "../../assets/images/icons/order.svg"

///Background
import { Token } from "@block-wallet/background/controllers/erc-20/Token"

///Utils
import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits } from "@ethersproject/units"
import { formatRounded } from "../../util/formatRounded"
import { AssetsSortOptions, isNativeTokenAddress } from "../../util/tokenUtils"
import AssetsLoadingSkeleton from "./../skeleton/AssetsLoadingSkeleton"
import { useBlankState } from "../../context/background/backgroundHooks"
import SearchInput from "../input/SearchInput"
import AssetsButton from "../assets/AssetsButton"
import AssetsSort from "../assets/AssetsSort"
import { setTokensSortValue } from "../../context/commActions"
import AutoSizer from "react-virtualized/dist/commonjs/AutoSizer"
import List from "react-virtualized/dist/commonjs/List"
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
            className={classnames(
                "flex flex-row items-center justify-between px-6 py-4 transition duration-300",
                "hover:bg-primary-100 hover:bg-opacity-50 active:bg-primary-200 active:bg-opacity-50",
                "cursor-pointer"
            )}
            style={{ width: "calc(88% + 3rem)" }}
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

    const isLoading = state.isNetworkChanging

    const [deletedTokens, setDeletedTokens] = useState([] as string[])
    const [currentAssets, setCurrentAssets] = useState(assets)
    const pushDeleteTokens = (deleteToken: string) => {
        setDeletedTokens([...deletedTokens, deleteToken])
    }
    useEffect(() => {
        setCurrentAssets(
            assets.filter((t) => !deletedTokens.includes(t.token.address))
        )
    }, [assets, deletedTokens])
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

    const ref = useRef<any>()

    useEffect(() => {
        // react-virtualized does not recompute row height when the underlying transaction data changes.
        // thats why we force a height recompution here and adjust tx height based on its state.
        ref.current && ref.current.recomputeRowHeights(0)
    }, [currentAssets])

    return (
        <>
            {isLoading ? (
                <div
                    className="flex flex-col flex-1 w-full space-y-0"
                    role="list"
                    aria-label="assets"
                >
                    <AssetsLoadingSkeleton />
                </div>
            ) : (
                <AutoSizer className="hide-scroll snap-y">
                    {({ height }) => (
                        <List
                            id="assets-list"
                            height={height}
                            width={358}
                            style={{
                                overflowX: "hidden",
                                marginLeft: "-24px",
                            }}
                            ref={ref}
                            rowCount={currentAssets.length}
                            overscanRowCount={5}
                            rowHeight={72} // height in px
                            className="hide-scroll"
                            rowRenderer={({
                                style,
                                key,
                                index,
                            }: {
                                style: any
                                key: string
                                index: number
                            }) => (
                                <div style={style} key={key}>
                                    {index > 0 ? (
                                        <div className="px-6">
                                            <hr />
                                        </div>
                                    ) : null}
                                    <Asset
                                        asset={currentAssets[index]}
                                        pushDeleteTokens={pushDeleteTokens}
                                    />
                                </div>
                            )}
                        ></List>
                    )}
                </AutoSizer>
            )}
        </>
    )
}

const AssetsList = () => {
    const { tokensSortValue, hideSmallBalances } = useBlankState()!
    const history = useOnMountHistory()
    const [sortValue, setSortValue] = useState<AssetsSortOptions>(
        tokensSortValue as AssetsSortOptions
    )
    const currentNetworkTokens = useTokenListWithNativeToken(
        sortValue,
        hideSmallBalances
    )
    const searchInputRef = useRef<HTMLInputElement>(null)
    const { search, tokensResult, onChangeSearch } =
        useTokenSearch(currentNetworkTokens)

    useEffect(() => {
        const updateSortValue = async () => {
            await setTokensSortValue(sortValue)
        }

        if (sortValue !== tokensSortValue) {
            updateSortValue()
        }
    }, [sortValue, tokensSortValue])

    return (
        <>
            <div className="pt-3 bg-white z-[9] flex flex-col">
                <div className="flex flex-row space-x-2">
                    <div className="flex-1">
                        <SearchInput
                            inputClassName="!h-8"
                            placeholder={`Search`}
                            onChange={(e) => {
                                onChangeSearch(e.target.value)
                            }}
                            debounced
                            defaultValue={search}
                            ref={searchInputRef}
                            showClearIcon={true}
                        />
                    </div>
                    <AssetsButton
                        onClick={() => {
                            history.push({
                                pathname: "/settings/tokens/add",
                            })
                        }}
                        title="Add Token"
                        icon={plus}
                    />
                    <AssetsSort
                        onClick={setSortValue}
                        selectedValue={sortValue}
                    />
                    <AssetsButton
                        onClick={() => {
                            history.push({
                                pathname: "/accounts/menu/tokensOrder",
                                state: { isFromHomePage: true },
                            })
                        }}
                        title="Edit Assets Order"
                        icon={order}
                        disabled={sortValue !== AssetsSortOptions.CUSTOM}
                    />
                </div>
            </div>
            <div
                className="flex flex-col flex-1 w-full space-y-0 h-full min-h-[430px]"
                data-testid="activity-list"
            >
                <SubAssetList assets={tokensResult} />
            </div>
        </>
    )
}

export default AssetsList
