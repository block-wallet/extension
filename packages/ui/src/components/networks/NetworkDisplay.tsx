import { useDrag, useDrop, DragSourceMonitor } from "react-dnd"
import { useRef } from "react"
import { RiArrowRightSLine } from "react-icons/ri"
import { HiDotsVertical } from "react-icons/hi"

import { Network } from "@block-wallet/background/utils/constants/networks"

interface NetworkInfo extends Network {
    color: string
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
    moveCard: (draggedIndex: number, hoveredOnIndex: number) => void
    isTestnet?: boolean
}) => {
    const ref = useRef<HTMLDivElement>(null)

    const [, drop] = useDrop(
        () => ({
            accept: isTestnet ? "testnet" : "mainnet",
            hover(item: { index: number }, monitor: any) {
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
                    moveCard(draggedIndex, hoveredOnIndex)
                    item.index = hoveredOnIndex
                }
            },
        }),
        [moveCard, index]
    )

    const [{ isDragging }, drag] = useDrag(
        () => ({
            type: isTestnet ? "testnet" : "mainnet",
            item: { index },
            collect: (monitor: DragSourceMonitor) => ({
                isDragging: monitor.isDragging(),
            }),
            end: (item: { index: number }, monitor: DragSourceMonitor) => {
                const didDrop = monitor.didDrop()
                if (!didDrop) {
                    moveCard(item.index, index)
                }
            },
        }),
        [index, moveCard]
    )

    drag(drop(ref))

    return (
        <div
            onClick={onClick}
            className="hover:bg-gray-100 hover:cursor-pointer rounded-md"
            ref={ref}
            style={{ cursor: "pointer", opacity: isDragging ? 0.4 : 1 }}
        >
            <div className="flex flex-row justify-between items-center p-2 pl-0">
                <div className="flex flex-row items-center">
                    <HiDotsVertical className="text-gray-500 mr-2" size={20} />
                    <span
                        className="h-2 w-2 rounded-xl mr-2"
                        style={{
                            backgroundColor: networkInfo.color,
                        }}
                    />
                    <span
                        title={networkInfo.desc}
                        className="text-sm font-bold text-ellipsis overflow-hidden whitespace-nowrap"
                    >
                        {networkInfo.desc}
                    </span>
                </div>
                <RiArrowRightSLine size={20} />
            </div>
        </div>
    )
}
export default NetworkDisplay
