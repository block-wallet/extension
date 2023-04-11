import { useDrag, useDrop, DragSourceMonitor } from "react-dnd"
import { useEffect, useRef, useState } from "react"
import classnames from "classnames"
import { HiDotsVertical } from "react-icons/hi"
import { RiPencilFill } from "react-icons/ri"
import { useBlankState } from "../../context/background/backgroundHooks"
import { changeNetwork } from "../../context/commActions"
import useIsHovering from "../../util/hooks/useIsHovering"

import { Network } from "@block-wallet/background/utils/constants/networks"
import ConfirmDialog from "../dialog/ConfirmDialog"
import Icon, { IconName } from "../ui/Icon"
import WaitingDialog, { useWaitingDialog } from "../dialog/WaitingDialog"

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

    const { isHovering: isHoveringIcons, getIsHoveringProps } = useIsHovering()

    const { isOpen, status, dispatch } = useWaitingDialog()

    const [confirmSwitchNetwork, setConfirmSwitchNetwork] = useState(false)
    const [hasImageError, setHasImageError] = useState(false)

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

    const cardHoverStyle = !dropAnimation && !isHoveringIcons

    return (
        <div
            className={classnames(
                "rounded-lg",
                dropAnimation &&
                    "bg-primary-grey-default transition-colors animate-[pulse_0.8s]",
                cardHoverStyle && "hover:bg-primary-grey-default"
            )}
            ref={dropRef}
            style={{ opacity }}
        >
            <WaitingDialog
                status={status}
                open={isOpen}
                titles={{
                    loading: "Switching network...",
                    error: "Error",
                    success: "Success!",
                }}
                texts={{
                    loading:
                        "Please wait while the network is being switched...",
                    error: "There was an error while switching the network",
                    success: `Switch to ${networkInfo.desc} network was successful.`,
                }}
                onDone={() => {
                    dispatch({ type: "close" })
                }}
                timeout={1100}
            />

            <ConfirmDialog
                title="Switch Network"
                message={`Are you sure you want to switch to ${networkInfo.desc} network?`}
                open={confirmSwitchNetwork}
                onClose={() => setConfirmSwitchNetwork(false)}
                onConfirm={async () => {
                    dispatch({
                        type: "open",
                        payload: { status: "loading" },
                    })
                    await changeNetwork(networkInfo.name)
                    dispatch({
                        type: "setStatus",
                        payload: { status: "success" },
                    })
                }}
            />
            <>
                <div className="flex flex-row justify-between items-center pr-2 pl-0 h-full">
                    <div
                        className="flex flex-row group items-center py-2 cursor-move"
                        ref={dragRef}
                    >
                        <div
                            className="flex flex-row items-center"
                            title="Drag to sort"
                        >
                            <HiDotsVertical
                                className="text-primary-grey-dark mr-2"
                                size={20}
                            />
                            {!hasImageError &&
                            networkInfo.iconUrls &&
                            networkInfo.iconUrls.length > 0 ? (
                                <img
                                    src={networkInfo.iconUrls[0]}
                                    alt="network icon"
                                    className="w-4 h-4 mr-2"
                                    onError={() => {
                                        setHasImageError(true)
                                    }}
                                />
                            ) : (
                                <span
                                    className={
                                        "h-2 w-2 rounded-xl ml-[0.20rem] mr-3"
                                    }
                                    style={{
                                        backgroundColor: networkInfo.color,
                                    }}
                                />
                            )}
                        </div>
                        <span className="text-base font-semibold text-ellipsis overflow-hidden whitespace-nowrap">
                            {networkInfo.desc}
                        </span>
                    </div>
                    <div className="flex flex-row items-center h-full">
                        {isSelectedNetwork ? (
                            <div
                                className="px-2 text-secondary-green-default"
                                title="Current network"
                            >
                                <Icon
                                    name={IconName.CHECKMARK}
                                    className="fill-secondary-green-default"
                                />
                            </div>
                        ) : (
                            <div
                                {...getIsHoveringProps()}
                                className="p-2 hover:cursor-pointer transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                                title="Switch network"
                                onClick={() => setConfirmSwitchNetwork(true)}
                            >
                                <Icon name={IconName.SWITCH} />
                            </div>
                        )}
                        <div
                            {...getIsHoveringProps()}
                            className="p-2 hover:cursor-pointer transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                            title="Edit network"
                            onClick={onClick}
                        >
                            <RiPencilFill size={18} />
                        </div>
                    </div>
                </div>
            </>
        </div>
    )
}
export default NetworkDisplay
