import { ChainListItem } from "@block-wallet/background/utils/chainlist"
import { useRef, useState } from "react"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import ChainDisplay from "../../components/chain/ChainDisplay"
import SearchInput from "../../components/input/SearchInput"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import Spinner from "../../components/spinner/Spinner"
import { searchChainsByTerm } from "../../context/commActions"
import useAsyncInvoke from "../../util/hooks/useAsyncInvoke"
import searchIcon from "../../assets/images/icons/search.svg"
import ClickableText from "../../components/button/ClickableText"
import { useHistory } from "react-router-dom"
import { useBlankState } from "../../context/background/backgroundHooks"
import ChainFiltersButton, {
    ChainFilters,
} from "../../components/chain/ChainFiltersButton"
import EmptyState from "../../components/ui/EmptyState"
import { parseChainId } from "../../util/networkUtils"

interface ChainData {
    chain: ChainListItem
    isEnabled: boolean
}

const SearchNetworkPage = () => {
    const [filters, setFilters] = useState<ChainFilters[]>([])
    const history = useHistory()
    const hintRef = useRef<string | null>()
    const { availableNetworks } = useBlankState()!
    const [pickedChain, setPickedChain] = useState<ChainData | null>(null)
    const { run, isLoading, data, reset, isIdle, isSuccess } = useAsyncInvoke<
        ChainData[]
    >({
        data: [],
    })
    const onChange = (event: any) => {
        let value = (event.target.value || "").toString()
        if (pickedChain) {
            setPickedChain(null)
        }

        //If the value can be parsed as int, means that the value is either a number or an hex string.
        const valueAsNumber = parseChainId(value)
        if (valueAsNumber && !isNaN(valueAsNumber)) {
            value = valueAsNumber.toString()
        }

        hintRef.current = value

        if (!value) {
            reset()
            return
        }
        run(searchChainsByTerm(value))
    }

    const addOrEditNetwork = async () => {
        const network = Object.values(availableNetworks).find(
            (network) =>
                network.enable && network.chainId === pickedChain?.chain.chainId
        )

        //If network is already added, then redirect the user to the details page.
        if (network) {
            return history.push({
                pathname: "/settings/networks/details",
                state: {
                    network,
                },
            })
        }

        history.push({
            pathname: "/settings/networks/add/suggested",
            state: {
                suggestedChain: pickedChain?.chain,
            },
        })
    }
    const manuallyAddNetwork = () => {
        history.push({
            pathname: "/settings/networks/add/manual",
            state: {
                hint: hintRef.current || "",
            },
        })
    }

    const filterChains = (chainData: ChainData) => {
        if (!filters.includes(ChainFilters.ENABLED) && chainData.isEnabled) {
            return false
        }

        if (
            !filters.includes(ChainFilters.TESTNET) &&
            chainData.chain.isTestnet
        ) {
            return false
        }
        return true
    }

    const filteredChains = (data || []).filter(filterChains)

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Search Networks"
                    close="/"
                    onBack={() => {
                        history.push("/settings/networks")
                    }}
                />
            }
            footer={
                pickedChain ? (
                    <PopupFooter>
                        <ButtonWithLoading
                            type="button"
                            label={
                                pickedChain.isEnabled
                                    ? "Edit Network"
                                    : "Add Network"
                            }
                            onClick={addOrEditNetwork}
                        />
                    </PopupFooter>
                ) : null
            }
            submitOnEnter={{
                onSubmit: addOrEditNetwork,
                isEnabled: !!pickedChain,
            }}
        >
            <div className="w-76 w-full p-6 pb-4 bg-white fixed z-20 flex flex-col">
                <div className="flex flex-row space-x-2">
                    <div className="flex-1">
                        <SearchInput
                            placeholder="Input Chain ID or Name..."
                            disabled={false}
                            autoFocus={true}
                            onChange={onChange}
                            debounced
                        />
                    </div>
                    <ChainFiltersButton
                        filters={filters}
                        onChangeFilters={setFilters}
                    />
                </div>
                {isSuccess && (
                    <span className="text-xs mt-2">
                        Network not found?{" "}
                        <ClickableText onClick={manuallyAddNetwork}>
                            Add it manually.
                        </ClickableText>
                    </span>
                )}
            </div>
            <div className="flex flex-col h-full w-full p-6">
                <div className="w-full mt-20 h-full">
                    {isIdle && (
                        <div className="flex flex-col items-center justify-start flex-1 h-full p-6">
                            <div className="flex justify-center items-center relative mb-6">
                                <img
                                    src={searchIcon}
                                    alt="search"
                                    className="w-7 h-7 absolute z-10"
                                />
                                <div className="w-20 h-20 bg-primary-grey-default rounded-full relative z-0"></div>
                            </div>
                            <span className="text-sm text-primary-grey-dark text-center">
                                Search the networks you want to add by name or
                                chain identification. Or add{" "}
                                <ClickableText onClick={manuallyAddNetwork}>
                                    add it manually.
                                </ClickableText>
                            </span>
                        </div>
                    )}
                    {isLoading && (
                        <div className="w-full h-full flex justify-center items-center">
                            <Spinner size="24px" />
                        </div>
                    )}
                    {isSuccess && (
                        <div className="flex flex-col space-y-1 pb-4 h-full">
                            <div className="text-xs text-primary-grey-dark pt-2 pb-1">
                                SEARCH NETWORKS
                            </div>
                            <div className="flex flex-col overflow-y-auto h-50">
                                {filteredChains && filteredChains.length ? (
                                    filteredChains.map(
                                        ({ chain, isEnabled }) => {
                                            return (
                                                <ChainDisplay
                                                    key={chain.chainId}
                                                    chainId={chain.chainId}
                                                    name={chain.name}
                                                    logoUrl={chain.logo}
                                                    selected={
                                                        pickedChain?.chain
                                                            ?.chainId ===
                                                        chain.chainId
                                                    }
                                                    isTestnet={chain.isTestnet!}
                                                    isEnabled={isEnabled}
                                                    onClick={() =>
                                                        setPickedChain({
                                                            chain,
                                                            isEnabled,
                                                        })
                                                    }
                                                />
                                            )
                                        }
                                    )
                                ) : (
                                    <EmptyState
                                        title="No results"
                                        className="p-6"
                                    >
                                        <span>
                                            The network you are searching for is
                                            unknown to BlockWallet. Try to
                                            adjusting your search term or
                                            filters, or{" "}
                                            <ClickableText
                                                onClick={manuallyAddNetwork}
                                            >
                                                add it manually.
                                            </ClickableText>
                                        </span>
                                    </EmptyState>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PopupLayout>
    )
}

export default SearchNetworkPage
