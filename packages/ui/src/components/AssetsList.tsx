import { BigNumber } from "@ethersproject/bignumber"
import { Fragment, FunctionComponent, useEffect, useRef, useState } from "react"
import { useOnMountHistory } from "../context/hooks/useOnMount"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import {
    TokenList,
    useTokenListWithNativeToken,
} from "../context/hooks/useTokensList"
import { formatUnits } from "@ethersproject/units"

import plus from "../assets/images/icons/plus.svg"
import ChevronRightIcon from "./icons/ChevronRightIcon"
import { formatRounded } from "../util/formatRounded"
import { ActionButton } from "./button/ActionButton"
import AssetsLoadingSkeleton from "./skeleton/AssetsLoadingSkeleton"
import useCurrencyFromatter from "../util/hooks/useCurrencyFormatter"
import { AssetsSortOptions, isNativeTokenAddress } from "../util/tokenUtils"
import { useBlankState } from "../context/background/backgroundHooks"
import TokenLogo from "./token/TokenLogo"
import SearchInput from "./input/SearchInput"
import AssetsSort from "./assets/AssetsSort"
import useTokenSearch from "../util/hooks/token/useTokenSearch"
import AssetsButton from "./assets/AssetsButton"
import order from "../assets/images/icons/order.svg"
import { setTokensSortValue } from "../context/commActions"

export type AssetItem = {
    token: Token
    balance: BigNumber
}

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
            className="flex flex-row items-center justify-between px-6 py-4 -ml-6 transition duration-300 hover:bg-primary-grey-default hover:bg-opacity-50 active:bg-primary-grey-hover active:bg-opacity-50 cursor-pointer"
            style={{ width: "calc(100% + 2 * 1.5rem)" }}
            role="listitem"
            aria-label={asset.token.symbol}
        >
            <div className="flex flex-row items-center">
                <TokenLogo
                    logo={asset.token.logo}
                    name={asset.token.symbol ?? ""}
                    logoSize="big"
                    filled={true}
                />
                <div className="flex flex-col ml-2 mr-2">
                    <span
                        className="text-sm font-semibold"
                        title={`${formatUnits(
                            asset.balance || "0",
                            asset.token.decimals
                        )} ${asset.token.symbol}`}
                    >
                        {`${formatRounded(
                            formatUnits(
                                asset.balance || "0",
                                asset.token.decimals
                            ),
                            4
                        )}
                                    ${asset.token.symbol}`}
                    </span>
                    <span className="text-[11px] text-primary-grey-dark">
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
    const { isNetworkChanging } = useBlankState()!

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
            className="flex flex-col flex-1 w-full space-y-0"
            role="list"
            aria-label="assets"
        >
            {isNetworkChanging ? (
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

const AssetsList = () => {
    const { tokensSortValue } = useBlankState()!
    // const { chainId } = useSelectedNetwork()
    const history = useOnMountHistory()
    const [sortValue, setSortValue] = useState<AssetsSortOptions>(
        tokensSortValue as AssetsSortOptions
    )
    const currentNetworkTokens = useTokenListWithNativeToken(sortValue)
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
                className="flex flex-col w-full space-y-4"
                data-testid="assets-list"
            >
                <div className="flex flex-col w-full space-y-1">
                    <SubAssetList assets={tokensResult} />
                </div>
                <div className="flex flex-col w-full space-y-1">
                    <ActionButton
                        icon={plus}
                        label="Add Token"
                        to="/settings/tokens/add"
                    />
                </div>
            </div>
        </>
    )
}

export default AssetsList
