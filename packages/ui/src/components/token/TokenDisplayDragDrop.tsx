import TokenLogo from "./TokenLogo"
import classnames from "classnames"
import { TokenResponse } from "../../routes/settings/AddTokensPage"
import { useState, FunctionComponent, useRef, useEffect } from "react"
import { BigNumber } from "@ethersproject/bignumber"
import { formatRounded } from "../../util/formatRounded"
import { formatUnits } from "@ethersproject/units"
import { DragSourceMonitor, useDrag, useDrop } from "react-dnd"
import useIsHovering from "../../util/hooks/useIsHovering"
import { TokenWithBalance } from "../../context/hooks/useTokensList"
import { HiDotsVertical } from "react-icons/hi"
import { MdDragIndicator } from "react-icons/md"
import useCurrencyFromatter from "../../util/hooks/useCurrencyFormatter"
import { isNativeTokenAddress } from "../../util/tokenUtils"

type TokenCardProps = {
    tokenInfo: TokenResponse
    originalIndex: number
}

type TokenDisplayType = {
    data: TokenResponse
    hoverable?: boolean | false
    balance?: BigNumber | undefined
    moveTokenCard: (draggedIndex: string, hoveredOnIndex: number) => void
    findTokenCard: (address: string) => {
        token: TokenWithBalance
        index: number
    }
    onSuccessfulDrop: () => void
}

/**
 * TokenDisplay:
 * Creates a display element to show token information.
 * Can or cannot be clicked to show a selected style.
 * Can show a selected style.
 *
 * @param data - Object containing token to display's informations.
 * @param hoverable - Determines if the element shows a hover style.
 * @param balance - Contains the asset balance in case it exists. e.g. if it is a New Asset there is no balance
 * @param moveTokenCard - Changes the token order to new position
 * @param findTokenCard - Finds a token by address
 * @param onSuccessfulDrop - If drop was successful we saved the new order in the state
 */
const TokenDisplayDragDrop: FunctionComponent<TokenDisplayType> = ({
    data,
    hoverable,
    balance,
    moveTokenCard,
    findTokenCard,
    onSuccessfulDrop,
}) => {
    const { isHovering: isHoveringIcons } = useIsHovering()
    const [dropAnimation, setDropAnimation] = useState(false)
    const dropRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef<HTMLDivElement>(null)
    const formatter = useCurrencyFromatter()

    const originalIndex = findTokenCard(data.address).index

    const [{ isDragging }, drag, preview] = useDrag(
        () => ({
            type: "token",
            item: { tokenInfo: data, originalIndex: originalIndex },
            // This is used to inject isDragging variable into the component
            collect: (monitor: DragSourceMonitor) => ({
                isDragging: monitor.isDragging(),
            }),
            // triggered when the dragging of this component is stopped
            end: (item: TokenCardProps, monitor: DragSourceMonitor) => {
                const didDrop = monitor.didDrop()
                // if the drop was not successful in a dropzone, we return the card to its original position
                if (!didDrop) {
                    moveTokenCard(item.tokenInfo.address, item.originalIndex)
                }
            },
        }),
        [data, originalIndex, moveTokenCard]
    )

    const [, drop] = useDrop(
        () => ({
            accept: "token",
            // Called when a dragged item is hovered over this component.
            hover(item: TokenCardProps) {
                if (item.tokenInfo.address !== data.address) {
                    const { index: overIndex } = findTokenCard(data.address)
                    // move the dragged item to the hovered item's position
                    moveTokenCard(item.tokenInfo.address, overIndex)
                }
            },
            collect(monitor) {
                if (monitor.didDrop()) {
                    const dropResult = monitor.getDropResult() as TokenCardProps
                    // If the drop was successful, we trigger the animation and update background networks state
                    if (dropResult.tokenInfo.address === data.address) {
                        setDropAnimation(true)
                        onSuccessfulDrop()
                    }
                }
            },
            drop(item: TokenCardProps) {
                return item
            },
        }),
        [findTokenCard, moveTokenCard]
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

    const opacity = isDragging ? 0.5 : 1

    const cardHoverStyle = !dropAnimation && !isHoveringIcons && hoverable

    // Render
    return (
        <div
            className={classnames(
                "rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 transition-all duration-200",
                dropAnimation &&
                "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 animate-pulse",
                cardHoverStyle && "hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600",
                isDragging && "shadow-lg ring-2 ring-blue-500 dark:ring-blue-400 ring-opacity-50"
            )}
            ref={dropRef}
            style={{ opacity }}
        >
            <div
                className="flex flex-row justify-between items-center p-4 h-full cursor-move group"
                ref={dragRef}
                title="Drag to reorder"
            >
                <div className="flex flex-row items-center space-x-3 flex-1">
                    {/* Drag Handle */}
                    <div className="flex items-center justify-center">
                        <MdDragIndicator
                            className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors"
                            size={20}
                        />
                    </div>

                    {/* Token Logo */}
                    <TokenLogo
                        logo={data.logo}
                        name={data.symbol ?? ""}
                        logoSize="big"
                        filled={true}
                    />

                    {/* Token Information */}
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col min-w-0">
                                <span
                                    className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate"
                                    title={`${formatUnits(
                                        balance || "0",
                                        data.decimals
                                    )} ${data.symbol}`}
                                >
                                    {`${formatRounded(
                                        formatUnits(balance || "0", data.decimals),
                                        4
                                    )} ${data.symbol}`}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {formatter.format(
                                        balance || BigNumber.from(0),
                                        data.symbol,
                                        data.decimals ?? 18,
                                        isNativeTokenAddress(data.address)
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Drag Visual Indicator */}
                    <div className="flex flex-col space-y-1 opacity-30 group-hover:opacity-60 transition-opacity">
                        <div className="w-3 h-0.5 bg-gray-400 dark:bg-gray-500 rounded"></div>
                        <div className="w-3 h-0.5 bg-gray-400 dark:bg-gray-500 rounded"></div>
                        <div className="w-3 h-0.5 bg-gray-400 dark:bg-gray-500 rounded"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TokenDisplayDragDrop
