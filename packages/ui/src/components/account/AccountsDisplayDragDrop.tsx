import classnames from "classnames"
import { useState, FunctionComponent, useRef, useEffect } from "react"
import { formatHashLastChars } from "../../util/formatAccount"
import { DragSourceMonitor, useDrag, useDrop } from "react-dnd"
import useIsHovering from "../../util/hooks/useIsHovering"
import { HiDotsVertical } from "react-icons/hi"
import { MdDragIndicator } from "react-icons/md"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import AccountIcon from "../icons/AccountIcon"
import { getAccountColor } from "../../util/getAccountColor"
import { useAddressWithChainIdChecksum } from "../../util/hooks/useSelectedAddressWithChainIdChecksum"
import useNetWorthBalance from "../../context/hooks/useNetWorthBalance"
import { AccountStatus } from "../../context/commTypes"

type AccountCardProps = {
    accountInfo: AccountInfo
    originalIndex: number
}

type AccountDisplayType = {
    account: AccountInfo
    hoverable?: boolean | false
    moveAccountCard: (draggedIndex: string, hoveredOnIndex: number) => void
    findAccountCard: (address: string) => {
        account: AccountInfo
        index: number
    }
    onSuccessfulDrop: () => void
    hiddenAccount: boolean
}

/**
 * AccountDisplayDragDrop:
 * Creates a display element to show account information.
 * It allows drag & drop.
 *
 * @param account - Object containing account to display's informations.
 * @param hoverable - Determines if the element shows a hover style.
 * @param moveTokenCard - Changes the account order to new position
 * @param findTokenCard - Finds a account by address
 * @param onSuccessfulDrop - If drop was successful we saved the new order in the state
 * @param hiddenAccount - If true, will indicate when it is a hidden account
 */
const AccountDisplayDragDrop: FunctionComponent<AccountDisplayType> = ({
    account,
    hoverable,
    hiddenAccount,
    moveAccountCard,
    findAccountCard,
    onSuccessfulDrop,
}) => {
    const checksumAddress = useAddressWithChainIdChecksum(account?.address)
    const { isHovering: isHoveringIcons } = useIsHovering()
    const [dropAnimation, setDropAnimation] = useState(false)
    const dropRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef<HTMLDivElement>(null)
    const originalIndex = findAccountCard(account.address).index
    const {
        displayNetWorth,
        netWorth,
        nativeTokenBalance,
        nativeTokenBalanceRounded,
    } = useNetWorthBalance(account)

    const [{ isDragging }, drag, preview] = useDrag(
        () => ({
            type: "account",
            item: { accountInfo: account, originalIndex: originalIndex },
            // This is used to inject isDragging variable into the component
            collect: (monitor: DragSourceMonitor) => ({
                isDragging: monitor.isDragging(),
            }),
            // triggered when the dragging of this component is stopped
            end: (item: AccountCardProps, monitor: DragSourceMonitor) => {
                const didDrop = monitor.didDrop()
                // if the drop was not successful in a dropzone, we return the card to its original position
                if (!didDrop) {
                    moveAccountCard(
                        item.accountInfo.address,
                        item.originalIndex
                    )
                }
            },
        }),
        [account, originalIndex, moveAccountCard]
    )

    const [, drop] = useDrop(
        () => ({
            accept: "account",
            // Called when a dragged item is hovered over this component.
            hover(item: AccountCardProps) {
                if (item.accountInfo.address !== account.address) {
                    const { index: overIndex } = findAccountCard(
                        account.address
                    )
                    // move the dragged item to the hovered item's position
                    moveAccountCard(item.accountInfo.address, overIndex)
                }
            },
            collect(monitor) {
                if (monitor.didDrop()) {
                    const dropResult =
                        monitor.getDropResult() as AccountCardProps
                    // If the drop was successful, we trigger the animation and update background networks state
                    if (dropResult.accountInfo.address === account.address) {
                        setDropAnimation(true)
                        onSuccessfulDrop()
                    }
                }
            },
            drop(item: AccountCardProps) {
                return item
            },
        }),
        [findAccountCard, moveAccountCard]
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
                isDragging && "shadow-lg ring-2 ring-green-500 dark:ring-green-400 ring-opacity-50"
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

                    {/* Account Icon */}
                    <AccountIcon
                        className="w-10 h-10"
                        fill={getAccountColor(checksumAddress)}
                    />

                    {/* Account Information */}
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col min-w-0">
                                <div className="flex flex-row space-x-1 items-center">
                                    <label
                                        className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[120px] text-sm"
                                        title={account.name}
                                        htmlFor={`check-account-${checksumAddress}`}
                                    >
                                        {account.name}
                                    </label>
                                    <span
                                        className="font-medium text-gray-600 dark:text-gray-400 text-xs"
                                        title={checksumAddress}
                                    >
                                        {formatHashLastChars(checksumAddress)}
                                    </span>
                                    {hiddenAccount &&
                                        account.status ===
                                        AccountStatus.HIDDEN && (
                                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-full">
                                                HIDDEN
                                            </span>
                                        )}
                                </div>
                                <span
                                    className="text-xs text-gray-500 dark:text-gray-400 truncate"
                                    title={
                                        displayNetWorth
                                            ? netWorth
                                            : nativeTokenBalance
                                    }
                                >
                                    {displayNetWorth
                                        ? netWorth
                                        : nativeTokenBalanceRounded}
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

export default AccountDisplayDragDrop
