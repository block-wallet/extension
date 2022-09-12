import DropDownSelector from "../input/DropDownSelector"
import SearchInput from "../input/SearchInput"
import TokenDisplay from "../token/TokenDisplay"
import plusIcon from "../../assets/images/icons/plus.svg"
import {
    ChangeEvent,
    Dispatch,
    FC,
    SetStateAction,
    useEffect,
    useState,
} from "react"
import {
    TokenWithBalance,
    useTokensList,
} from "../../context/hooks/useTokensList"
import { ActionButton } from "../button/ActionButton"
import { BigNumber } from "ethers"
import { formatNumberLength } from "../../util/formatNumberLength"
import { formatRounded } from "../../util/formatRounded"
import { formatUnits } from "ethers/lib/utils"
import { searchTokenInAssetsList } from "../../context/commActions"
import { useCustomCompareEffect } from "use-custom-compare"
import { useDepositTokens } from "../../context/hooks/useDepositTokens"
import { useSwappedTokenList } from "../../context/hooks/useSwappedTokenList"
import classnames from "classnames"
import TokenLogo from "../token/TokenLogo"

export enum AssetListType {
    ALL = "ALL",
    DEFAULT = "DEFAULT",
    DEPOSIT = "DEPOSIT",
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
    const [searchResult, setSearchResult] = useState<TokenWithBalance[]>([])
    const [search, setSearch] = useState<string | null>(null)
    const [assetList, setAssetList] = useState<TokenWithBalance[]>([])

    const { currentNetworkTokens, nativeToken } = useTokensList()
    const depositsAssetList = useDepositTokens()
    const swappedAssetList = useSwappedTokenList()

    const defaultAssetList = [nativeToken].concat(currentNetworkTokens)

    useEffect(() => {
        // Only set asset list if this keeps being empty due to hooks init
        if (!assetList.length) {
            setAssetList(
                selectedAssetList === AssetListType.DEFAULT
                    ? defaultAssetList
                    : depositsAssetList
            )
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultAssetList, depositsAssetList])

    useEffect(() => {
        const searchAll = async () => {
            // If there is no search return the list of swapped assets
            if (!search) {
                setSearchResult(swappedAssetList)
                return
            }

            const input = search.toLowerCase()
            let searchRes = await searchTokenInAssetsList(input)

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
                        token: searchRes[index],
                        balance: ZERO_BN,
                    })
                    continue
                }

                const lcSymbol = searchRes[index].symbol.toLowerCase()

                if (input === lcSymbol) {
                    exactResult.push({
                        token: searchRes[index],
                        balance: ZERO_BN,
                    })
                    continue
                }

                const isPartialResult = lcSymbol.startsWith(input)

                if (isPartialResult) {
                    partialResult.push({
                        token: searchRes[index],
                        balance: ZERO_BN,
                    })
                } else {
                    elseResult.push({
                        token: searchRes[index],
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

    // List
    const AssetList = ({
        setActive,
    }: {
        setActive?: Dispatch<SetStateAction<boolean>>
    }) => {
        return (
            <div className="pb-6">
                <input
                    readOnly
                    name="asset"
                    ref={register ? register.ref : null}
                    className="hidden"
                    value={selectedAsset?.token.address}
                />
                {searchResult.map((asset, index) => {
                    return (
                        <div
                            className="cursor-pointer"
                            key={index.toString()}
                            onClick={() => onAssetClick(asset, setActive)}
                        >
                            <TokenDisplay
                                data={{
                                    ...asset.token,
                                }}
                                clickable={false}
                                active={
                                    selectedAsset?.token.address ===
                                    asset.token.address
                                }
                                hoverable={true}
                            />
                        </div>
                    )
                })}
                {search &&
                    searchResult.length === 0 &&
                    selectedAssetList !== AssetListType.DEPOSIT && (
                        <div className="px-3">
                            <p className="text-xs text-black text-center p-4">
                                The asset couldn’t be found, try adding it
                                manually.
                            </p>
                            <ActionButton
                                icon={plusIcon}
                                label="Add Token"
                                to="/settings/tokens/add"
                                state={{
                                    addTokenState,
                                    searchValue: search,
                                }}
                            />
                        </div>
                    )}
            </div>
        )
    }

    const dropdownDisplay = selectedAsset ? (
        <div className="flex flex-row flex-grow justify-between items-center">
            {displayIcon && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full mr-2">
                    <TokenLogo
                        src={selectedAsset.token.logo}
                        alt={selectedAsset.token.name}
                    />
                </div>
            )}
            <div className="flex flex-grow justify-between space-x-1">
                <div className="flex flex-col justify-center">
                    <span className="text-base font-semibold">
                        {selectedAsset.token.symbol}
                    </span>
                    {!customAmount && (
                        <span
                            title={assetBalance}
                            className={classnames(
                                "text-xs text-gray-600 mt-1 truncate",
                                assetBalanceClassName
                            )}
                        >
                            {assetBalance}
                        </span>
                    )}
                </div>
                {customAmount && (
                    <span
                        className="text-base font-semibold ml-auto mr-2 truncate max-w-lg"
                        title={customAmount?.toString()}
                        style={{ maxWidth: "8.5rem" }}
                    >
                        {formatNumberLength(
                            formatRounded(
                                formatUnits(
                                    customAmount,
                                    selectedAsset.token.decimals
                                ),
                                9
                            ),
                            12
                        )}
                    </span>
                )}
            </div>
        </div>
    ) : (
        <div className="flex flex-col justify-center w-full">
            <div className="text-base font-semibold">Select...</div>
        </div>
    )

    return (
        <DropDownSelector
            display={dropdownDisplay}
            error={error}
            topMargin={topMargin || 0}
            bottomMargin={bottomMargin || 0}
            popupMargin={popupMargin || 16}
            customWidth={dropdownWidth}
        >
            <div className="w-full p-3">
                <SearchInput
                    name="tokenName"
                    placeholder="Search Tokens by name or fill in Address"
                    disabled={false}
                    autoFocus={true}
                    onChange={onSearchInputChange}
                />
            </div>
            <AssetList />
        </DropDownSelector>
    )
}
