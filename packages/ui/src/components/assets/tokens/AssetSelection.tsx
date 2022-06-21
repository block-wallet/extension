import React, { useState } from "react"
import {
    TokenList,
    TokenWithBalance,
} from "../../../context/hooks/useTokensList"
import DropDownSelector from "../../input/DropDownSelector"
import SearchInput from "../../input/SearchInput"
import TokenDisplay from "../../TokenDisplay"
import { formatUnits } from "ethers/lib/utils"
import { formatRounded } from "../../../util/formatRounded"
import { useCustomCompareEffect } from "use-custom-compare"
import { BigNumber } from "ethers"
import unknownTokenIcon from "../../../assets/images/unknown_token.svg"

// Types
interface AssetSelectionProps {
    register?: any
    error?: any
    setValue?: any
    assets: TokenList
    defaultAsset?: TokenWithBalance | undefined
    onAssetChange?: (asset: TokenWithBalance) => any
    topMargin?: number
    bottomMargin?: number
    popupMargin?: number
    header?: string
    isShort?: boolean
    dropdownWidth?: string
    valueInAsset?: number
}

export const AssetSelection = (props: AssetSelectionProps) => {
    const {
        register,
        error,
        setValue,
        assets,
        defaultAsset,
        onAssetChange,
        topMargin,
        bottomMargin,
        popupMargin,
        header = "Asset",
        isShort = false,
        dropdownWidth,
        valueInAsset = undefined,
    } = props

    // State
    const [search, setSearch] = useState<string>("")
    const [selectedToken, setSelectedToken] = useState<
        TokenWithBalance | undefined
    >(defaultAsset)
    const [inputValue, setInputValue] = useState<string | undefined>(
        defaultAsset?.token.address
    )

    // Handler
    const onChange = (event: any) => {
        const value = event.target.value
        // Update input value & check if empty
        setSearch(value)
    }

    const onClick = (
        asset: TokenWithBalance,
        setActive: (state: boolean) => void
    ) => {
        setSelectedToken(asset)
        onAssetChange && onAssetChange(asset)
        setInputValue(asset.token.address)
        if (setValue) {
            setValue("asset", asset.token.address, {
                shouldValidate: true,
            })
        }
        setActive(false)
    }

    // Effect to update selected token when balance is updated to make parent component estimate gas again.
    useCustomCompareEffect(
        () => {
            if (!selectedToken) return

            const token = assets.find(
                (t) => t.token.address === selectedToken.token.address
            )
            if (!token) return

            setSelectedToken(token)
            onAssetChange && onAssetChange(token)
        },
        [assets],
        (prevDeps, nextDeps) => {
            const prevAssets = prevDeps[0]
            const nextAssets = nextDeps[0]

            // No selected token, skip effect.
            if (!selectedToken) return true

            const prevToken = prevAssets.find(
                (t) => t.token.address === selectedToken.token.address
            )

            // Token not found, skip effect
            if (!prevToken) return true

            const nextToken = nextAssets.find(
                (t) => t.token.address === selectedToken.token.address
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

    const filteredTokens = React.useMemo(() => {
        return assets.filter(({ token }: TokenWithBalance) => {
            if (search !== "") {
                const name = token.name.toUpperCase()
                const symbol = token.symbol.toUpperCase()
                const uppercasedSearch = search.toUpperCase()
                return (
                    name.includes(uppercasedSearch) ||
                    symbol.includes(uppercasedSearch)
                )
            } else {
                return true
            }
        })
    }, [search, assets])

    // Subcomponent
    const Child = (props: any) => {
        return (
            <div className="py-6">
                <input
                    name="asset"
                    ref={register}
                    className="hidden"
                    value={inputValue}
                    onChange={() => {}}
                />
                {filteredTokens.map((asset: TokenWithBalance, index) => {
                    return (
                        <div
                            className="cursor-pointer"
                            key={`selected-${index}`}
                            onClick={() => onClick(asset, props.setActive)}
                        >
                            <TokenDisplay
                                data={{
                                    ...asset.token,
                                }}
                                clickable={false}
                                active={
                                    selectedToken?.token.address ===
                                    asset.token.address
                                }
                                hoverable={true}
                            />
                        </div>
                    )
                })}
            </div>
        )
    }

    // subcomponent for a mini version of the tokenDisplay
    const MiniTokenDisplay = (props: any) => {
        return (
            <div className="flex justify-start items-center flex-row">
                <div className="flex flex-row items-center justify-center w-8 h-7 p-1.5 bg-white border border-gray-200 rounded-full">
                    <img
                        src={
                            props.token.logo === ""
                                ? unknownTokenIcon
                                : props.token.logo
                        }
                        alt={props.token.name}
                        className="rounded-full"
                    />
                </div>
                <div className="flex justify-between items-center h-full w-full ml-2 box-border">
                    <span className="text-base text-black font-semibold">
                        {props.token.symbol}
                    </span>
                    {props.valueInAsset && (
                        <span className="text-base text-black font-semibold text-right">
                            {props.valueInAsset}
                        </span>
                    )}
                </div>
            </div>
        )
    }

    // Component
    return (
        <div className={!error ? "mb-3" : ""}>
            <div className="ml-1 mb-2 text-sm text-gray-600">{header}</div>
            <DropDownSelector
                title={
                    selectedToken ? (
                        isShort ? (
                            <MiniTokenDisplay
                                token={selectedToken.token}
                                valueInAsset={valueInAsset}
                            />
                        ) : (
                            selectedToken.token.symbol
                        )
                    ) : isShort ? (
                        "Select..."
                    ) : (
                        "Select an asset"
                    )
                }
                subtitle={
                    selectedToken && !isShort
                        ? `
                            ${formatRounded(
                                formatUnits(
                                    selectedToken.balance || "0",
                                    selectedToken.token.decimals
                                ),
                                4
                            )}
                            ${selectedToken.token.symbol}
                        `
                        : ""
                }
                customWidth={dropdownWidth}
                topMargin={topMargin || 0}
                bottomMargin={bottomMargin || 0}
                popupMargin={popupMargin || 16}
                error={error}
            >
                <div className="w-full p-6 pb-0">
                    <SearchInput
                        name="tokenName"
                        value={search}
                        placeholder="Search Tokens"
                        disabled={false}
                        autofocus={true}
                        onChange={onChange}
                    />
                </div>
                <Child />
            </DropDownSelector>
        </div>
    )
}
