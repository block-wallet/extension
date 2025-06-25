import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { useCallback, useEffect, useState } from "react"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import NetworkDisplay from "../../components/networks/NetworkDisplay"
import plusIcon from "../../assets/images/icons/plus.svg"
import { ActionButton } from "../../components/button/ActionButton"
import { useBlankState } from "../../context/background/backgroundHooks"
import { editNetworksOrder } from "../../context/commActions"
import { sortNetworksByOrder } from "../../util/networkUtils"
import { Network } from "@block-wallet/background/utils/constants/networks"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { editNetworkOrder } from "@block-wallet/background/utils/types/communication"
import { getNetworkColor } from "../../util/getNetworkColor"
import { HiGlobeAlt, HiCog, HiInformationCircle } from "react-icons/hi"
import { BsDot, BsArrowsMove } from "react-icons/bs"

interface NetworkInfo extends Network {
    color: string
}

interface MappedNetworks {
    testnets: NetworkInfo[]
    mainnets: NetworkInfo[]
}

const NetworksPage = () => {
    const { availableNetworks, selectedNetwork } = useBlankState()!
    const history = useOnMountHistory()

    const [mainNetworks, setMainNetworks] = useState([] as NetworkInfo[])
    const [testNetworks, setTestNetworks] = useState([] as NetworkInfo[])

    const isFromHomePage = history.location.state?.isFromHomePage ?? false

    const onClickNetwork = (network: NetworkInfo) => {
        history.push({
            pathname: "/settings/networks/details",
            state: {
                network,
            },
        })
    }

    const findNetworkCard = useCallback(
        (chainId: number, isTestnet: boolean) => {
            const networks = isTestnet ? testNetworks : mainNetworks

            const network = networks.find((n) => n.chainId === chainId)!
            return {
                network,
                index: networks.indexOf(network),
            }
        },
        [mainNetworks, testNetworks]
    )

    const moveNetworkCard = useCallback(
        (chainId: number, hoveredOnIndex: number, isTestnet: boolean) => {
            const { network, index: draggedIndex } = findNetworkCard(
                chainId,
                isTestnet
            )

            const networks = isTestnet ? testNetworks : mainNetworks
            const setNetworks = isTestnet ? setTestNetworks : setMainNetworks
            const draggedItem = network

            const newNetworks = structuredClone(networks)
            newNetworks.splice(draggedIndex, 1) // removing what is being dragged.
            newNetworks.splice(hoveredOnIndex, 0, draggedItem) // adding the dragged item to the new hovered on index.

            setNetworks(newNetworks)
        },
        [findNetworkCard, mainNetworks, testNetworks]
    )

    function onSuccessfulDrop(isTestnet: boolean) {
        const networks = isTestnet ? testNetworks : mainNetworks

        let networksOrder: editNetworkOrder[] = []

        networks.forEach((network, index) => {
            networksOrder.push({
                chainId: network.chainId,
                order: index + 1,
            })
        })

        editNetworksOrder({
            networksOrder: networksOrder,
        })
    }

    useEffect(() => {
        const parsedAvailableNetworks = Object.values(availableNetworks)
            .sort(sortNetworksByOrder)
            .reduce(
                (acc: MappedNetworks, current: Network) => {
                    if (!current.enable) {
                        return acc
                    }
                    const color = getNetworkColor(current)
                    const netInfo: NetworkInfo = {
                        ...current,
                        color,
                    }
                    if (current.test) {
                        return {
                            ...acc,
                            testnets: [...acc.testnets, netInfo],
                        }
                    }
                    return {
                        ...acc,
                        mainnets: [...acc.mainnets, netInfo],
                    }
                },
                {
                    testnets: [],
                    mainnets: [],
                }
            )
        setMainNetworks(parsedAvailableNetworks.mainnets)
        setTestNetworks(parsedAvailableNetworks.testnets)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const totalNetworks = mainNetworks.length + testNetworks.length

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Networks"
                    onBack={() =>
                        history.push(isFromHomePage ? "/" : "/settings")
                    }
                />
            }
        >
            <div className="flex flex-col p-6 space-y-6 w-full">
                {/* Network Management Header */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <HiGlobeAlt className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-grow">
                            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                Network Management
                            </h3>
                            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                Configure and organize blockchain networks. You can add custom networks, edit existing ones, and reorder them for quick access.
                            </p>
                            <div className="mt-3 flex items-center space-x-4 text-xs text-blue-600 dark:text-blue-400">
                                <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span>Current: {selectedNetwork}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <span className="font-medium">{totalNetworks}</span>
                                    <span>configured</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Network Button */}
                <ActionButton
                    icon={plusIcon}
                    label="Add New Network"
                    to="/settings/networks/search"
                />

                {/* Drag & Drop Instructions */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-center space-x-2">
                        <BsArrowsMove className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                            Drag and drop networks to reorder them for quick access
                        </span>
                    </div>
                </div>

                <DndProvider backend={HTML5Backend}>
                    <div className="flex flex-col space-y-6">
                        {/* Mainnet Section */}
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <BsDot className="w-5 h-5 text-green-500" />
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    Mainnet Networks
                                </span>
                                <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                        {mainNetworks.length}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                {mainNetworks.length > 0 ? (
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {mainNetworks.map((network) => (
                                            <NetworkDisplay
                                                key={network.chainId}
                                                networkInfo={network}
                                                onClick={() => onClickNetwork(network)}
                                                moveNetworkCard={moveNetworkCard}
                                                findNetworkCard={findNetworkCard}
                                                onSuccessfulDrop={() =>
                                                    onSuccessfulDrop(false)
                                                }
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center">
                                        <HiInformationCircle className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            No mainnet networks configured
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Testnet Section */}
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <BsDot className="w-5 h-5 text-orange-500" />
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    Testnet Networks
                                </span>
                                <div className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                                    <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                                        {testNetworks.length}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                {testNetworks.length > 0 ? (
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {testNetworks.map((network) => (
                                            <NetworkDisplay
                                                key={network.chainId}
                                                networkInfo={network}
                                                onClick={() => onClickNetwork(network)}
                                                moveNetworkCard={moveNetworkCard}
                                                findNetworkCard={findNetworkCard}
                                                isTestnet
                                                onSuccessfulDrop={() =>
                                                    onSuccessfulDrop(true)
                                                }
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center">
                                        <HiInformationCircle className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            No testnet networks configured
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            Add testnets for development and testing
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DndProvider>

                {/* Network Tips */}
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <HiInformationCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-grow">
                            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                                Network Safety Tips
                            </h4>
                            <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                                <li>• Always verify custom RPC URLs before adding networks</li>
                                <li>• Use official network documentation when possible</li>
                                <li>• Test with small amounts when using new networks</li>
                                <li>• Keep your mainnet and testnet assets separate</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default NetworksPage
