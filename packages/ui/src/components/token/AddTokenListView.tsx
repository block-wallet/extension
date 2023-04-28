import { useEffect, useState } from "react"
import AutoSizer from "react-virtualized/dist/commonjs/AutoSizer"
import List from "react-virtualized/dist/commonjs/List"
import TokenDisplay from "./TokenDisplay"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import searchIcon from "../../assets/images/icons/search.svg"
import { TokenResponse } from "../../routes/settings/AddTokensPage"
import useSubmitOnEnter from "../../util/hooks/useSubmitOnEnter"

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
    // const [message, setMessage] = useState<string>("")
    const [selected, setSelected] = useState<TokenResponse[]>([])

    // Handlers
    const onSubmit = async (e?: any) => {
        e?.preventDefault()

        // Valid form data
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

    // Functions
    const onClick = (token: TokenResponse) => {
        // Check if the token is already selected
        if (!selected.some((el) => el.address === token.address)) {
            // Add selected token
            setSelected((prev) => prev.concat(token))
        } else {
            // Remove selected token
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
            {/* HINT */}
            {searchedValue === "" && selected.length <= 0 ? (
                <div className="flex flex-col pt-20">
                    <div className="flex justify-center items-center mb-6">
                        <img
                            src={searchIcon}
                            alt="search"
                            className="w-7 h-7 absolute z-10"
                        />
                        <div className="w-20 h-20 bg-primary-100 rounded-full relative z-0"></div>
                    </div>
                    <span className="text-sm text-gray-600 text-center">
                        Add the tokens that you've acquired using BlockWallet.
                        <br />
                        Enter an address for adding a custom token.
                    </span>
                </div>
            ) : (
                <form
                    id="listViewForm"
                    className="w-full h-0 max-h-screen px-6 pb-0 mt-16"
                    onSubmit={onSubmit}
                >
                    <div>
                        <div
                            className={`text-xs text-gray-500 pt-4 pb-0 ${
                                selected.length <= 0 ? "hidden" : "visible"
                            }`}
                        >
                            SELECTED TOKENS
                        </div>
                        <div className="flex flex-col">
                            {selected.map((select) => {
                                // Selected tokens
                                return (
                                    <div
                                        className="cursor-pointer"
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
                                )
                            })}
                        </div>
                        <div
                            className={`text-xs text-gray-500 pt-4 pb-1 ${
                                searchedValue === "" ? "hidden" : "visible"
                            }`}
                        >
                            SEARCH TOKENS
                        </div>
                        <div className="flex flex-col">
                            {results.length < 1 && selected.length <= 0 ? (
                                <div className="text-base font-bold text-black w-full text-center mt-4">
                                    No match
                                </div>
                            ) : (
                                <div
                                    style={{
                                        height: 314,
                                    }}
                                    className="w-full"
                                >
                                    <AutoSizer>
                                        {({
                                            width,
                                            height,
                                        }: {
                                            width: number
                                            height: number
                                        }) => (
                                            <List
                                                height={height}
                                                width={width}
                                                rowCount={
                                                    filteredResults.length
                                                }
                                                rowHeight={60}
                                                rowRenderer={({
                                                    style,
                                                    key,
                                                    index,
                                                }: {
                                                    style: any
                                                    key: string
                                                    index: number
                                                }) => (
                                                    <div
                                                        style={style}
                                                        className="cursor-pointer"
                                                        key={key}
                                                        onClick={() =>
                                                            onClick(
                                                                filteredResults[
                                                                    index
                                                                ]
                                                            )
                                                        }
                                                    >
                                                        <TokenDisplay
                                                            data={
                                                                filteredResults[
                                                                    index
                                                                ]
                                                            }
                                                            clickable={false}
                                                            active={false}
                                                            hoverable={true}
                                                        />
                                                    </div>
                                                )}
                                            />
                                        )}
                                    </AutoSizer>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            )}
        </div>
    )
}

export default AddTokenListView
