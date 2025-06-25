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
import { HiSearch, HiInformationCircle, HiPlus, HiGlobeAlt } from "react-icons/hi"
import { BsFilter, BsLightningCharge } from "react-icons/bs"

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
            <div className="flex flex-col h-full w-full">
                {/* Search Header - Fixed */}
                <div className="w-full p-6 pb-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    {/* Search Instructions */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-3 mb-4">
                        <div className="flex items-start space-x-2">
                            <HiSearch className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                                    Find Networks by Name or Chain ID
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                    Search our network database or add custom networks manually. Use filters to narrow down results.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Search Input and Filters */}
                    <div className="flex flex-row space-x-3">
                        <div className="flex-1">
                            <SearchInput
                                placeholder="Input Chain ID or Name..."
                                disabled={false}
                                autoFocus={true}
                                onChange={onChange}
                                debounced
                            />
                        </div>
                        <div className="flex items-center">
                            <ChainFiltersButton
                                filters={filters}
                                onChangeFilters={setFilters}
                            />
                        </div>
                    </div>

                    {/* Manual Add Suggestion */}
                    {isSuccess && (
                        <div className="flex items-center justify-between mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-2">
                                <HiInformationCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                    Network not found?
                                </span>
                            </div>
                            <ClickableText
                                onClick={manuallyAddNetwork}
                                className="text-xs font-medium flex items-center space-x-1"
                            >
                                <HiPlus className="w-3 h-3" />
                                <span>Add manually</span>
                            </ClickableText>
                        </div>
                    )}
                </div>

                {/* Search Results Content */}
                <div className="flex-1 flex flex-col p-6 overflow-hidden">
                    {/* Initial State */}
                    {isIdle && (
                        <div className="flex flex-col items-center justify-center flex-1 h-full">
                            <div className="flex justify-center items-center relative mb-8">
                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full relative flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                    <HiGlobeAlt className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                </div>
                            </div>
                            <div className="text-center space-y-4 max-w-md">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Search Networks
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Search for blockchain networks by name or chain ID. You can also use filters to find specific types of networks.
                                </p>
                                <div className="pt-2">
                                    <ClickableText
                                        onClick={manuallyAddNetwork}
                                        className="text-sm font-medium flex items-center justify-center space-x-2"
                                    >
                                        <HiPlus className="w-4 h-4" />
                                        <span>Add custom network manually</span>
                                    </ClickableText>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex flex-col justify-center items-center space-y-4 flex-1">
                            <Spinner size="32px" />
                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Searching Networks...
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Finding matching blockchain networks
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Search Results */}
                    {isSuccess && (
                        <div className="flex flex-col space-y-4 flex-1 overflow-hidden">
                            {/* Results Header */}
                            <div className="flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Search Results
                                    </span>
                                    <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                            {filteredChains.length}
                                        </span>
                                    </div>
                                </div>
                                {filters.length > 0 && (
                                    <div className="flex items-center space-x-1">
                                        <BsFilter className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {filters.length} filter{filters.length !== 1 ? 's' : ''} active
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Results List */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex-1 flex flex-col">
                                {filteredChains && filteredChains.length ? (
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto flex-1">
                                        {filteredChains.map(({ chain, isEnabled }, index) => (
                                            <ChainDisplay
                                                key={chain.chainId}
                                                chainId={chain.chainId}
                                                name={chain.name}
                                                logoUrl={chain.logo}
                                                selected={
                                                    pickedChain?.chain?.chainId === chain.chainId
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
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center flex-1 flex flex-col justify-center">
                                        <div className="space-y-4">
                                            <div className="flex justify-center">
                                                <HiSearch className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                    No Networks Found
                                                </h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                                                    The network you're searching for isn't in our database. Try adjusting your search term or filters.
                                                </p>
                                            </div>
                                            <div className="pt-2">
                                                <ClickableText
                                                    onClick={manuallyAddNetwork}
                                                    className="text-sm font-medium flex items-center justify-center space-x-2"
                                                >
                                                    <HiPlus className="w-4 h-4" />
                                                    <span>Add custom network manually</span>
                                                </ClickableText>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Selection Info */}
                            {pickedChain && (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-3 flex-shrink-0">
                                    <div className="flex items-start space-x-2">
                                        <BsLightningCharge className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-grow">
                                            <p className="text-xs font-medium text-green-800 dark:text-green-200">
                                                Network Selected: {pickedChain.chain.name}
                                            </p>
                                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                                {pickedChain.isEnabled
                                                    ? "This network is already configured. You can edit its settings."
                                                    : "Click the button below to add this network to your wallet."
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </PopupLayout>
    )
}

export default SearchNetworkPage
