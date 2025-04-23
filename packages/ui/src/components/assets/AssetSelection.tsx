import DropDownSelector from "../input/DropDownSelector"
import SearchInput from "../input/SearchInput"
import {
    ChangeEvent,
    Dispatch,
    FC,
    SetStateAction,
    useEffect,
    useState,
    memo,
    useRef,
    useLayoutEffect,
} from "react"
import {
    TokenWithBalance,
    useTokenListWithNativeToken,
} from "../../context/hooks/useTokensList"
import { BigNumber } from "@ethersproject/bignumber"
import { formatRounded } from "../../util/formatRounded"
import { formatUnits } from "@ethersproject/units"
import { searchTokenInAssetsList } from "../../context/commActions"
import { useCustomCompareEffect } from "use-custom-compare"
import { useSwappedTokenList } from "../../context/hooks/useSwappedTokenList"
import AssetDropdownDisplay from "./AssetDropdownDisplay"
import AssetList from "./AssetList"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { useBlankState } from "../../context/background/backgroundHooks"
import { AssetsSortOptions } from "../../util/tokenUtils"

export enum AssetListType {
    ALL = "ALL",
    DEFAULT = "DEFAULT",
}

interface AssetSelectionProps {
    selectedAssetList: AssetListType
    onAssetChange: (asset: TokenWithBalance) => void
    selectedAsset?: TokenWithBalance
    customAmount?: BigNumber
    displayIcon?: boolean
    error?: string
    register?: any
    topMargin?: number
    bottomMargin?: number
    popupMargin?: number
    dropdownWidth?: string
    //It will be used to return the token(in case of new one) to swap page
    addTokenState?: any
    assetBalanceClassName?: string
}

const ZERO_BN = BigNumber.from(0)
const SEARCH_LIMIT = 20

function mergeAssetList(
    baseList: TokenWithBalance[],
    mergeList: TokenWithBalance[]
): TokenWithBalance[] {
    const baseListAddresses = baseList.map(({ token }) =>
        token.address.toLowerCase()
    )
    return baseList.concat(
        mergeList.filter(
            ({ token }) =>
                !baseListAddresses.includes(token.address.toLowerCase())
        )
    )
}

export const AssetSelection: FC<AssetSelectionProps> = ({
    onAssetChange,
    selectedAssetList,
    selectedAsset,
    customAmount,
    displayIcon = false,
    error,
    topMargin,
    bottomMargin,
    popupMargin,
    dropdownWidth,
    assetBalanceClassName,
    addTokenState,
    register,
}) => {
    const { tokensSortValue, hideSmallBalances } = useBlankState()!
    const [searchResult, setSearchResult] = useState<TokenWithBalance[]>([])
    const [search, setSearch] = useState<string | null>(null)
    const [assetList, setAssetList] = useState<TokenWithBalance[]>([])
    const defaultAssetList = useTokenListWithNativeToken(
        tokensSortValue as AssetsSortOptions,
        hideSmallBalances
    )

    // Ref to get the dropdown width/height container
    const contentRef = useRef<HTMLDivElement>(null);
    const [listWidth, setListWidth] = useState<number | string>("100%");
    const [listHeight, setListHeight] = useState<number>(250); // Default height

    useLayoutEffect(() => {
        if (contentRef.current) {
            setListWidth(contentRef.current.clientWidth);
            // Height calculation remains tricky without knowing DropDownSelector structure
            // Let's keep a fixed height for now, or adjust based on available space approx.
            const searchInputHeight = 50; // Approximate height of search input + padding
            const availableHeight = window.innerHeight - (contentRef.current.getBoundingClientRect().top + searchInputHeight) - 80; // Approx
            setListHeight(Math.max(150, Math.min(availableHeight, 300)));
        }
    }, []); // Run once on layout

    const swappedAssetList = useSwappedTokenList()

    useEffect(() => {
        // Only set asset list if this keeps being empty due to hooks init
        if (!assetList.length) {
            setAssetList(defaultAssetList)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultAssetList])

    useEffect(() => {
        const searchAll = async () => {
            // If there is no search return the list of swapped assets
            if (!search) {
                setSearchResult(mergeAssetList(swappedAssetList, assetList))
                return
            }

            const input = search.toLowerCase()
            let searchRes = (await searchTokenInAssetsList(input)).tokens

            searchRes = searchRes.filter((t) => !!t.symbol)

            // Order search
            let ownedAsset: TokenWithBalance[] = []
            let exactResult: TokenWithBalance[] = []
            let partialResult: TokenWithBalance[] = []
            let elseResult: TokenWithBalance[] = []

            // Limit the results
            const searchLength =
                searchRes.length > SEARCH_LIMIT
                    ? SEARCH_LIMIT
                    : searchRes.length

            for (let index = 0; index < searchLength; index++) {
                const ownedArray = defaultAssetList.filter(({ token }) => {
                    return (
                        token.address.toLowerCase() ===
                        searchRes[index].address.toLowerCase()
                    )
                })

                if (ownedArray.length) {
                    ownedAsset.push({
                        token: searchRes[index] as Token,
                        balance: ZERO_BN,
                    })
                    continue
                }

                const lcSymbol = searchRes[index].symbol.toLowerCase()

                if (input === lcSymbol) {
                    exactResult.push({
                        token: searchRes[index] as Token,
                        balance: ZERO_BN,
                    })
                    continue
                }

                const isPartialResult = lcSymbol.startsWith(input)

                if (isPartialResult) {
                    partialResult.push({
                        token: searchRes[index] as Token,
                        balance: ZERO_BN,
                    })
                } else {
                    elseResult.push({
                        token: searchRes[index] as Token,
                        balance: ZERO_BN,
                    })
                }
            }

            setSearchResult(
                ownedAsset
                    .concat(exactResult)
                    .concat(partialResult)
                    .concat(elseResult)
            )
        }

        if (selectedAssetList !== AssetListType.ALL) {
            const result = assetList.filter(({ token }: TokenWithBalance) => {
                if (!search) {
                    return true
                }

                const name = token.name.toUpperCase()
                const symbol = token.symbol.toUpperCase()
                const uppercasedSearch = search.toUpperCase()

                return (
                    name.includes(uppercasedSearch) ||
                    symbol.includes(uppercasedSearch)
                )
            })

            setSearchResult(result)
        } else {
            searchAll()
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, assetList])

    const onSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        let value: string | null = event.target.value

        value = value.replace(/\W/g, "")

        if (!value) {
            value = null
        }

        setSearch(value)
    }

    const onAssetClick = async (
        asset: TokenWithBalance,
        setActive?: Dispatch<SetStateAction<boolean>>
    ) => {
        const assetBalance =
            defaultAssetList.find(
                (element) => element.token.address === asset.token.address
            )?.balance || BigNumber.from(0)

        onAssetChange({
            token: asset.token,
            balance: assetBalance,
        })
        setActive && setActive(false)
    }

    // Effect to update selected token when balance is updated to make parent component estimate gas again.
    useCustomCompareEffect(
        () => {
            if (!selectedAsset) return

            const asset = assetList.find(
                (t) => t.token.address === selectedAsset.token.address
            )

            if (asset) {
                onAssetChange(asset)
            }
        },
        [assetList],
        (prevDeps, nextDeps) => {
            const prevAssets = prevDeps[0]
            const nextAssets = nextDeps[0]

            // No selected token, skip effect.
            if (!selectedAsset || !prevAssets || !nextAssets) return true

            const prevToken = prevAssets.find(
                (t) => t.token.address === selectedAsset.token.address
            )

            // Token not found, skip effect
            if (!prevToken) return true

            const nextToken = nextAssets.find(
                (t) => t.token.address === selectedAsset.token.address
            )

            // Token not found, skip effect
            if (!nextToken) return true

            // Compare balances
            const oldBalance = BigNumber.from(prevToken.balance)
            const newBalance = BigNumber.from(nextToken.balance)

            // If equal, skip effect
            return oldBalance.eq(newBalance)
        }
    )

    const assetBalance: string | undefined = selectedAsset?.balance
        ? formatRounded(
            formatUnits(
                selectedAsset.balance || 0,
                selectedAsset.token.decimals
            ),
            4
        )
        : undefined

    return (
        <DropDownSelector
            display={
                <AssetDropdownDisplay
                    selectedAsset={selectedAsset}
                    displayIcon={displayIcon}
                    customAmount={customAmount}
                    assetBalance={assetBalance}
                    assetBalanceClassName={assetBalanceClassName}
                />
            }
            error={error}
            topMargin={topMargin || 0}
            bottomMargin={bottomMargin || 0}
            popupMargin={popupMargin || 16}
            customWidth={dropdownWidth}
        >
            <div ref={contentRef} className="flex flex-col">
                <div className="w-full p-3">
                    <SearchInput
                        name="tokenName"
                        placeholder="Search tokens by name or address"
                        disabled={false}
                        autoFocus={true}
                        onChange={onSearchInputChange}
                        defaultValue={search ?? ""}
                    />
                </div>
                <AssetList
                    addTokenState={addTokenState}
                    assets={searchResult}
                    onAssetClick={onAssetClick}
                    register={register}
                    searchValue={search}
                    selectedAddress={selectedAsset?.token.address}
                    dropdownWidth={listWidth}
                    dropdownHeight={listHeight}
                />
            </div>
        </DropDownSelector>
    )
}

// Memoize the AssetSelection component
export const MemoizedAssetSelection = memo(
    AssetSelection,
    (prevProps, nextProps) => {
        // Only re-render if key props change
        // Note: Comparing functions like onAssetChange might be tricky if they are not stable (useCallback)
        // For now, we compare critical data points.
        return (
            prevProps.selectedAssetList === nextProps.selectedAssetList &&
            prevProps.selectedAsset?.token.address ===
            nextProps.selectedAsset?.token.address &&
            prevProps.selectedAsset?.balance?.toString() ===
            nextProps.selectedAsset?.balance?.toString() &&
            prevProps.error === nextProps.error &&
            prevProps.customAmount?.toString() ===
            nextProps.customAmount?.toString() &&
            prevProps.displayIcon === nextProps.displayIcon
        )
    }
)
