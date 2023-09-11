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

    const opacity = isDragging ? 0 : 1

    const cardHoverStyle = !dropAnimation && !isHoveringIcons && hoverable

    // Render
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
            <div
                className="flex flex-row justify-between items-center pr-2 pl-0 h-full cursor-move"
                ref={dragRef}
                title="Drag to sort"
            >
                <div className="flex flex-row group items-center py-2">
                    <div className="flex flex-row items-center space-x-2 pl-1">
                        <HiDotsVertical
                            className="text-primary-grey-dark"
                            size={20}
                        />
                        <TokenLogo
                            logo={data.logo}
                            name={data.symbol ?? ""}
                            logoSize="big"
                            filled={true}
                        />
                        <div className="flex flex-col ml-2 mr-2">
                            <span
                                className="text-sm font-semibold"
                                title={`${formatUnits(
                                    balance || "0",
                                    data.decimals
                                )} ${data.symbol}`}
                            >
                                {`${formatRounded(
                                    formatUnits(balance || "0", data.decimals),
                                    4
                                )}
                                    ${data.symbol}`}
                            </span>
                            <span className="text-[11px] text-primary-grey-dark">
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
            </div>
        </div>
    )
}

export default TokenDisplayDragDrop
