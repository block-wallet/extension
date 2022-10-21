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
    index: number
    isTestnet: boolean
}

const NetworkDisplay = ({
    networkInfo,
    onClick,
    index,
    moveCard,
    isTestnet = false,
}: {
    networkInfo: NetworkInfo
    onClick: () => void
    index: number
    moveCard: (
        draggedIndex: number,
        hoveredOnIndex: number,
        isTestnet: boolean
    ) => void
    isTestnet?: boolean
}) => {
    const [dropAnimation, setDropAnimation] = useState(false)

    const ref = useRef<HTMLDivElement>(null)

    const [, drop] = useDrop(
        () => ({
            accept: isTestnet ? "testnet" : "mainnet",
            hover(item: NetworkCardProps, monitor: any) {
                if (!ref.current) {
                    return
                }

                const draggedIndex = item.index
                const hoveredOnIndex = index

                if (draggedIndex === hoveredOnIndex) {
                    return
                }

                const hoverBoundingRect = ref.current?.getBoundingClientRect()
                const hoverMiddleY =
                    (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
                const hoverActualY =
                    monitor.getClientOffset().y - hoverBoundingRect.top

                // if dragging down, continue only when hover is smaller than middle Y
                if (
                    draggedIndex < hoveredOnIndex &&
                    hoverActualY < hoverMiddleY
                )
                    return
                // if dragging up, continue only when hover is bigger than middle Y
                if (
                    draggedIndex > hoveredOnIndex &&
                    hoverActualY > hoverMiddleY
                )
                    return

                if (draggedIndex !== hoveredOnIndex) {
                    moveCard(draggedIndex, hoveredOnIndex, isTestnet)
                    item.index = hoveredOnIndex
                }
            },
            collect(monitor) {
                if (monitor.didDrop()) {
                    const dropResult =
                        monitor.getDropResult() as NetworkCardProps
                    if (
                        dropResult.index === index &&
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
        [moveCard, index]
    )

    const [{ isDragging }, drag] = useDrag(
        () => ({
            type: isTestnet ? "testnet" : "mainnet",
            item: { index, isTestnet },
            collect: (monitor: DragSourceMonitor) => ({
                isDragging: monitor.isDragging(),
            }),
            end: (item: NetworkCardProps, monitor: DragSourceMonitor) => {
                const didDrop = monitor.didDrop()
                if (!didDrop) {
                    moveCard(item.index, index, isTestnet)
                }
            },
        }),
        [index, moveCard]
    )

    drag(drop(ref))

    useEffect(() => {
        if (dropAnimation) {
            setTimeout(() => {
                setDropAnimation(false)
            }, 750)
        }
    }, [dropAnimation])

    return (
        <div
            onClick={onClick}
            className={classnames(
                "rounded-md",
                isDragging && "bg-slate-600",
                dropAnimation &&
                    "bg-green-100 transition-colors animate-bounce",
                !dropAnimation && "hover:bg-gray-100 hover:cursor-pointer"
            )}
            ref={ref}
        >
            {!isDragging ? (
                <>
                    <div className="flex flex-row justify-between items-center p-2 pl-0">
                        <div className="flex flex-row group items-center">
                            <div
                                className="flex flex-row items-center cursor-move"
                                title="Drag to sort"
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
            ) : (
                <div className="h-9"></div>
            )}
        </div>
    )
}
export default NetworkDisplay
