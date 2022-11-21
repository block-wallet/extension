import { useDrag, useDrop, DragSourceMonitor } from "react-dnd"
import { useEffect, useRef, useState } from "react"
import classnames from "classnames"
import { HiDotsVertical } from "react-icons/hi"
import { MdOutlineChangeCircle, MdOutlineCheckCircle } from "react-icons/md"
import editIcon from "../../assets/images/icons/pencil.svg"
import { useBlankState } from "../../context/background/backgroundHooks"
import { changeNetwork } from "../../context/commActions"

import { Network } from "@block-wallet/background/utils/constants/networks"
import ConfirmDialog from "../dialog/ConfirmDialog"
import SuccessDialog from "../dialog/SuccessDialog"

interface NetworkInfo extends Network {
    color: string
}

type NetworkCardProps = {
    networkInfo: NetworkInfo
    originalIndex: number
    isTestnet: boolean
}

const NetworkDisplay = ({
    networkInfo,
    onClick,
    moveNetworkCard,
    isTestnet = false,
    findNetworkCard,
    onSuccessfulDrop,
}: {
    networkInfo: NetworkInfo
    onClick: () => void
    moveNetworkCard: (
        draggedIndex: number,
        hoveredOnIndex: number,
        isTestnet: boolean
    ) => void
    findNetworkCard: (
        chainId: number,
        isTestnet: boolean
    ) => {
        network: NetworkInfo
        index: number
    }
    isTestnet?: boolean
    onSuccessfulDrop: () => void
}) => {
    const { selectedNetwork } = useBlankState()!
    const isSelectedNetwork = selectedNetwork === networkInfo.name

    const [confirmSwitchNetwork, setConfirmSwitchNetwork] = useState(false)
    const [switchNetworkSuccess, setSwitchNetworkSuccess] = useState(false)

    const [dropAnimation, setDropAnimation] = useState(false)
    const dropRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef<HTMLDivElement>(null)

    const originalIndex = findNetworkCard(networkInfo.chainId, isTestnet).index

    const [{ isDragging }, drag, preview] = useDrag(
        () => ({
            type: isTestnet ? "testnet" : "mainnet",
            item: { networkInfo, originalIndex, isTestnet },
            // This is used to inject isDragging variable into the component
            collect: (monitor: DragSourceMonitor) => ({
                isDragging: monitor.isDragging(),
            }),
            // triggered when the dragging of this component is stopped
            end: (item: NetworkCardProps, monitor: DragSourceMonitor) => {
                const didDrop = monitor.didDrop()
                // if the drop was not successful in a dropzone, we return the card to its original position
                if (!didDrop) {
                    moveNetworkCard(
                        item.networkInfo.chainId,
                        item.originalIndex,
                        item.isTestnet
                    )
                }
            },
        }),
        [networkInfo, originalIndex, moveNetworkCard]
    )

    const [, drop] = useDrop(
        () => ({
            accept: isTestnet ? "testnet" : "mainnet",
            // Called when a dragged item is hovered over this component.
            hover(item: NetworkCardProps) {
                if (item.networkInfo.chainId !== networkInfo.chainId) {
                    const { index: overIndex } = findNetworkCard(
                        networkInfo.chainId,
                        isTestnet
                    )
                    // move the dragged item to the hovered item's position
                    moveNetworkCard(
                        item.networkInfo.chainId,
                        overIndex,
                        item.isTestnet
                    )
                }
            },
            collect(monitor) {
                if (monitor.didDrop()) {
                    const dropResult =
                        monitor.getDropResult() as NetworkCardProps
                    // If the drop was successful, we trigger the animation and update background networks state
                    if (
                        dropResult.networkInfo.chainId ===
                            networkInfo.chainId &&
                        dropResult.isTestnet === isTestnet
                    ) {
                        setDropAnimation(true)
                        onSuccessfulDrop()
                    }
                }
            },
            drop(item: NetworkCardProps) {
                return item
            },
        }),
        [findNetworkCard, moveNetworkCard]
    )

    preview(drop(dropRef))
    drag(dragRef)

    useEffect(() => {
        if (dropAnimation) {
            setTimeout(() => {
                setDropAnimation(false)
            }, 800)
        }
    }, [dropAnimation])

    const opacity = isDragging ? 0 : 1

    return (
        <div
            className={classnames(
                "rounded-md",
                dropAnimation &&
                    "bg-blue-100 transition-colors animate-[pulse_0.8s]",
                !dropAnimation && "hover:bg-gray-100"
            )}
            ref={dropRef}
            style={{ opacity }}
        >
            <ConfirmDialog
                title="Switch Network"
                message={`Are you sure you want to switch to ${networkInfo.desc} network?`}
                open={confirmSwitchNetwork}
                onClose={() => setConfirmSwitchNetwork(false)}
                onConfirm={async () => {
                    await changeNetwork(networkInfo.name)
                    setSwitchNetworkSuccess(true)
                    setConfirmSwitchNetwork(false)
                }}
            />
            <SuccessDialog
                open={switchNetworkSuccess}
                title={"Network Switched"}
                message={`Switch to ${networkInfo.desc} network was successful.`}
                onDone={() => {
                    setSwitchNetworkSuccess(false)
                }}
                timeout={1000}
            />
            <>
                <div className="flex flex-row justify-between items-center pr-2 pl-0 h-full">
                    <div className="flex flex-row group items-center py-2">
                        <div
                            className="flex flex-row items-center cursor-move"
                            title="Drag to sort"
                            ref={dragRef}
                        >
                            <HiDotsVertical
                                className="text-gray-500 mr-2"
                                size={20}
                            />
                            <span
                                className={"h-2 w-2 rounded-xl mr-2"}
                                style={{
                                    backgroundColor: networkInfo.color,
                                }}
                            />
                        </div>
                        <span className="text-sm font-bold text-ellipsis overflow-hidden whitespace-nowrap">
                            {networkInfo.desc}
                        </span>
                    </div>
                    <div className="flex flex-row items-center h-full">
                        {isSelectedNetwork ? (
                            <div className="px-2" title="Current network">
                                <MdOutlineCheckCircle
                                    size={20}
                                    className="text-green-600"
                                />
                            </div>
                        ) : (
                            <div
                                className="px-2 hover:cursor-pointer"
                                title="Change to current network"
                                onClick={() => setConfirmSwitchNetwork(true)}
                            >
                                <MdOutlineChangeCircle size={20} />
                            </div>
                        )}
                        <div
                            className="px-2 hover:cursor-pointer"
                            title="Edit network"
                            onClick={onClick}
                        >
                            <img src={editIcon} alt="Edit" className="w-3" />
                        </div>
                    </div>
                </div>
            </>
        </div>
    )
}
export default NetworkDisplay
