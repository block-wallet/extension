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
import { ethers } from "ethers"
import { getAccountColor } from "../../util/getAccountColor"
import { Network } from "@block-wallet/background/utils/constants/networks"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

interface NetworkInfo extends Network {
    color: string
}

interface MappedNetworks {
    testnets: NetworkInfo[]
    mainnets: NetworkInfo[]
}

const NetworksPage = () => {
    const { availableNetworks } = useBlankState()!
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

    const moveNetworkCard = useCallback(
        (draggedIndex: number, hoveredOnIndex: number, isTestnet: boolean) => {
            const networks = isTestnet ? testNetworks : mainNetworks
            const setNetworks = isTestnet ? setTestNetworks : setMainNetworks
            const draggedItem = networks[draggedIndex]
            const hoveredOnItem = networks[hoveredOnIndex]

            const hoveredOnOrder = hoveredOnItem.order
            const draggedOrder = draggedItem.order

            editNetworksOrder({
                networksOrder: [
                    {
                        chainId: draggedItem.chainId,
                        order: hoveredOnOrder,
                    },
                    {
                        chainId: hoveredOnItem.chainId,
                        order: draggedOrder,
                    },
                ],
            })

            setNetworks((prevNetworksState) => {
                const updatedNetworksList = [...prevNetworksState]
                // Switch order properties of draggedItem and hoveredOnItem
                updatedNetworksList[draggedIndex].order = hoveredOnOrder
                updatedNetworksList[hoveredOnIndex].order = draggedOrder
                // Switch the positions of draggedItem and hoveredOnItem in the array
                updatedNetworksList[draggedIndex] = hoveredOnItem
                updatedNetworksList[hoveredOnIndex] = draggedItem
                return updatedNetworksList
            })
        },
        [mainNetworks, testNetworks]
    )

    useEffect(() => {
        const parsedAvailableNetworks = Object.values(availableNetworks)
            .sort(sortNetworksByOrder)
            .reduce(
                (acc: MappedNetworks, current: Network) => {
                    if (!current.enable) {
                        return acc
                    }
                    const color = getAccountColor(
                        ethers.utils.keccak256(
                            ethers.utils.toUtf8Bytes(
                                current.name || current.desc
                            )
                        )
                    )
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
    }, [])

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
                <ActionButton
                    icon={plusIcon}
                    label="Add New Network"
                    to="/settings/networks/search"
                />
                <DndProvider backend={HTML5Backend}>
                    <div className="flex flex-col space-y-2">
                        <span className="text-xs text-gray-500">MAINNET</span>
                        <div className="flex flex-col space-y-2">
                            {mainNetworks.map((network, index) => (
                                <NetworkDisplay
                                    key={network.name}
                                    networkInfo={network}
                                    onClick={() => onClickNetwork(network)}
                                    index={index}
                                    moveCard={moveNetworkCard}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-gray-500 mt-4">
                            TESTNET
                        </span>
                        <div className="flex flex-col space-y-2">
                            {testNetworks.map((network, index) => (
                                <NetworkDisplay
                                    key={network.name}
                                    networkInfo={network}
                                    onClick={() => onClickNetwork(network)}
                                    index={index}
                                    moveCard={moveNetworkCard}
                                    isTestnet
                                />
                            ))}
                        </div>
                    </div>
                </DndProvider>
            </div>
        </PopupLayout>
    )
}

export default NetworksPage
