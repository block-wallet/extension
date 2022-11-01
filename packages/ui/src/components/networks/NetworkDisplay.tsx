import { useDrag, useDrop, DragSourceMonitor } from "react-dnd"
import { useEffect, useRef, useState } from "react"
import classnames from "classnames"
import { RiArrowRightSLine } from "react-icons/ri"
import { HiDotsVertical } from "react-icons/hi"

import { Network } from "@block-wallet/background/utils/constants/networks"

interface NetworkInfo extends Network {
    color: string
}

type NetworkCardProps = {
    networkInfo: NetworkInfo
    isTestnet: boolean
}

const NetworkDisplay = ({
    networkInfo,
    onClick,
    moveCard,
    isTestnet = false,
    findNetworkCard,
}: {
    networkInfo: NetworkInfo
    onClick: () => void
    moveCard: (
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
}) => {
    const [dropAnimation, setDropAnimation] = useState(false)
    const dropRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef<HTMLDivElement>(null)

    const originalIndex = findNetworkCard(networkInfo.chainId, isTestnet).index

    const [{ isDragging }, drag, preview] = useDrag(
        () => ({
            type: isTestnet ? "testnet" : "mainnet",
            item: { networkInfo, originalIndex, isTestnet },
            collect: (monitor: DragSourceMonitor) => ({
                isDragging: monitor.isDragging(),
            }),
            end: (item: NetworkCardProps, monitor: DragSourceMonitor) => {
                const didDrop = monitor.didDrop()
                if (!didDrop) {
                    moveCard(
                        item.networkInfo.chainId,
                        originalIndex,
                        item.isTestnet
                    )
                }
            },
        }),
        [networkInfo, originalIndex, moveCard]
    )

    const [, drop] = useDrop(
        () => ({
            accept: isTestnet ? "testnet" : "mainnet",
            hover(item: NetworkCardProps) {
                if (item.networkInfo.chainId !== networkInfo.chainId) {
                    const { index: overIndex } = findNetworkCard(
                        networkInfo.chainId,
                        isTestnet
                    )
                    moveCard(
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
                    if (
                        dropResult.networkInfo.chainId ===
                            networkInfo.chainId &&
                        dropResult.isTestnet === isTestnet
                    ) {
                        setDropAnimation(true)
                    }
                }
            },
            drop(item: NetworkCardProps) {
                return item
            },
        }),
        [moveCard, findNetworkCard]
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

    return (
        <div
            onClick={onClick}
            className={classnames(
                "rounded-md",
                dropAnimation &&
                    "bg-blue-100 transition-colors animate-[pulse_0.8s]",
                !dropAnimation && "hover:bg-gray-100 hover:cursor-pointer"
            )}
            ref={dropRef}
        >
            <>
                <div className="flex flex-row justify-between items-center p-2 pl-0">
                    <div className="flex flex-row group items-center">
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

                    <RiArrowRightSLine size={20} />
                </div>
            </>
        </div>
    )
}
export default NetworkDisplay
