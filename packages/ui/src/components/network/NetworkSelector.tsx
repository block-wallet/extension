import DropDownSelector from "../input/DropDownSelector"
import DropdownNetworkDisplay from "./DropdownNetworkDisplay"
import NetworkDisplay from "./NetworkDisplay"
import Spinner from "../spinner/Spinner"
import {
    ChangeEvent,
    Dispatch,
    FunctionComponent,
    SetStateAction,
    useEffect,
    useState,
} from "react"
import { IChain } from "@block-wallet/background/utils/types/chain"
import SearchInput from "../input/SearchInput"

interface NetworkSelectorProps {
    networkList: IChain[]
    onNetworkChange: (network: IChain | undefined) => void
    selectedNetwork?: IChain
    error?: string
    topMargin?: number
    bottomMargin?: number
    popupMargin?: number
    isLoading?: boolean
}

export const NetworkSelector: FunctionComponent<NetworkSelectorProps> = ({
    networkList,
    onNetworkChange,
    selectedNetwork,
    error,
    topMargin = 0,
    bottomMargin = 0,
    popupMargin = 16,
    isLoading = false,
}) => {
    const [searchResult, setSearchResult] = useState<IChain[]>([])
    const [search, setSearch] = useState<string | null>(null)

    useEffect(() => {
        if (!search) {
            setSearchResult(networkList)
            return
        }

        const input = search.toLowerCase()
        let result: IChain[] = []

        if (isNaN(Number(input))) {
            // Not a number, search by network name
            result = networkList.filter(({ name }) =>
                name.toLowerCase().includes(input)
            )
        } else {
            // Search by chain id
            const exact = networkList.filter(
                ({ id }) => id.toString() === input
            )

            const partial = networkList.filter(
                ({ id }) =>
                    id.toString().startsWith(input) && id.toString() !== input
            )

            result = exact.concat(partial)
        }

        setSearchResult(result)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, networkList])

    const onAssetClick = async (
        network: IChain,
        setActive?: Dispatch<SetStateAction<boolean>>
    ) => {
        onNetworkChange(network)
        setActive && setActive(false)
    }

    const onSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        let value: string | null = event.target.value

        value = value.replace(/\W/g, "")

        if (!value) {
            value = null
        }

        setSearch(value)
    }

    // List
    const NetworkList = ({
        setActive,
    }: {
        setActive?: Dispatch<SetStateAction<boolean>>
    }) => {
        return (
            <>
                <input
                    readOnly
                    name="network"
                    className="hidden"
                    value={selectedNetwork?.id}
                />
                {Object.values(searchResult).map((network, index) => {
                    return (
                        <DropdownNetworkDisplay
                            key={index.toString()}
                            network={network}
                            active={selectedNetwork?.id === network.id}
                            onClick={() => onAssetClick(network, setActive)}
                        />
                    )
                })}
                {search && searchResult.length === 0 && (
                    <div className="p-3">
                        <p className="text-xs text-black text-center">
                            No available networks match with the search.
                        </p>
                    </div>
                )}
            </>
        )
    }

    const dropdownDisplay = isLoading ? (
        <div className="flex items-center justify-center w-full">
            <Spinner size="24" />
        </div>
    ) : !networkList.length ? (
        <div className="text-base font-semibold">No available networks</div>
    ) : selectedNetwork ? (
        <NetworkDisplay
            network={selectedNetwork}
            padding={false}
            transparent={true}
            bigLogo={true}
        />
    ) : (
        <div className="text-base font-semibold">Select...</div>
    )

    return (
        <DropDownSelector
            display={dropdownDisplay}
            error={error}
            topMargin={topMargin}
            bottomMargin={bottomMargin}
            popupMargin={popupMargin}
            disabled={!networkList.length}
        >
            <div className="w-full p-3">
                <SearchInput
                    name="networkName"
                    placeholder="Search networks by name or id"
                    disabled={false}
                    autoFocus={true}
                    onChange={onSearchInputChange}
                />
            </div>
            <NetworkList />
        </DropDownSelector>
    )
}
