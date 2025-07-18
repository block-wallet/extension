import AutoSizer from "react-virtualized-auto-sizer"
import { FixedSizeList as List } from "react-window"

import TokenDisplay from "./TokenDisplay"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

import { TokenResponse } from "../../routes/settings/AddTokensPage"
import { useEffect, useState } from "react"
import useSubmitOnEnter from "../../util/hooks/useSubmitOnEnter"
import { Size } from "react-virtualized-auto-sizer"

export interface addTokenListView {
    results?: TokenResponse[]
    searchedValue?: string
    setSubmitEnabled?: (value: any) => Promise<any> | void
}

const AddTokenListView = ({
    results = [],
    searchedValue = "",
    setSubmitEnabled = undefined,
}: addTokenListView) => {
    const history = useOnMountHistory()
    const [selected, setSelected] = useState<TokenResponse[]>([])

    const onSubmit = async (e?: any) => {
        e?.preventDefault()

        if (selected.length > 0) {
            history.push({
                pathname: "/settings/tokens/add/confirm",
                state: {
                    tokens: selected,
                    searchedValue: searchedValue,
                    ...(history.location.state || {}),
                },
            })
        }
    }

    useSubmitOnEnter({ onSubmit, isEnabled: selected.length > 0 })

    const onClick = (token: TokenResponse) => {
        if (!selected.some((el) => el.address === token.address)) {
            setSelected((prev) => prev.concat(token))
        } else {
            setSelected((prev) =>
                prev.filter((el) => el.address !== token.address)
            )
        }
    }

    const filteredResults = results.filter(
        (result: { address: string }) =>
            !selected.some((el) => el.address === result.address)
    )

    useEffect(() => {
        if (setSubmitEnabled) {
            setSubmitEnabled(selected.length > 0)
        }
    }, [selected, setSubmitEnabled])

    return (
        <div className="h-full">
            {searchedValue === "" && selected.length <= 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mb-6 shadow-sm">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-600 flex items-center justify-center shadow-inner">
                            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Search for Tokens
                        </h3>
                        <div className="max-w-sm space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Add tokens that you've acquired using BlockWallet.
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                                💡 <strong>Tip:</strong> Enter a contract address to add custom tokens
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <form
                    id="listViewForm"
                    className="w-full h-full px-6 pb-6 space-y-6"
                    onSubmit={onSubmit}
                >
                    {/* Selected tokens section */}
                    {selected.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    SELECTED TOKENS ({selected.length})
                                </h3>
                            </div>
                            <div className="space-y-2 bg-green-50/50 dark:bg-green-900/10 rounded-xl p-4">
                                {selected.map((select) => (
                                    <div
                                        className="cursor-pointer transform hover:scale-[1.02] transition-transform duration-150"
                                        key={`selected-${select.address}`}
                                        onClick={() => onClick(select)}
                                    >
                                        <TokenDisplay
                                            data={select}
                                            clickable={false}
                                            active={true}
                                            hoverable={true}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search results section */}
                    {searchedValue !== "" && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        SEARCH RESULTS
                                    </h3>
                                </div>
                                {filteredResults.length > 0 && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                        {filteredResults.length} found
                                    </span>
                                )}
                            </div>

                            {results.length < 1 && selected.length <= 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
                                            No tokens found
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Try searching with a different term or contract address
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                                    <div style={{ height: 314 }} className="w-full">
                                        <AutoSizer>
                                            {({ width, height }: Size) => (
                                                <List
                                                    height={height}
                                                    width={width}
                                                    itemCount={filteredResults.length}
                                                    itemSize={60}
                                                    itemData={filteredResults}
                                                >
                                                    {({ style, data, index }) => (
                                                        <div
                                                            style={style}
                                                            className="cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors duration-150"
                                                            key={`result-${data[index].address}`}
                                                            onClick={() => onClick(data[index])}
                                                        >
                                                            <TokenDisplay
                                                                data={data[index]}
                                                                clickable={false}
                                                                active={false}
                                                                hoverable={true}
                                                            />
                                                        </div>
                                                    )}
                                                </List>
                                            )}
                                        </AutoSizer>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </form>
            )}
        </div>
    )
}

export default AddTokenListView
