import classnames from "classnames"
import { useState, FunctionComponent, useRef, useEffect } from "react"
import { formatHashLastChars } from "../../util/formatAccount"
import { DragSourceMonitor, useDrag, useDrop } from "react-dnd"
import useIsHovering from "../../util/hooks/useIsHovering"
import { HiDotsVertical } from "react-icons/hi"
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
                        <AccountIcon
                            className="w-10 h-10"
                            fill={getAccountColor(checksumAddress)}
                        />
                        <div className="flex flex-col ml-3">
                            <div
                                className={classnames(
                                    "relative flex flex-col items-start group"
                                )}
                            >
                                <div className="flex flex-row space-x-1">
                                    <label
                                        className={classnames(
                                            "font-semibold truncate max-w-[140px]"
                                        )}
                                        title={account.name}
                                        htmlFor={`check-account-${checksumAddress}`}
                                    >
                                        {account.name}
                                    </label>
                                    <span
                                        className="font-semibold"
                                        title={checksumAddress}
                                    >
                                        {formatHashLastChars(checksumAddress)}
                                    </span>
                                    {hiddenAccount &&
                                        account.status ===
                                            AccountStatus.HIDDEN && (
                                            <span className="font-semibold text-xxs text-primary-grey-dark">
                                                - HIDDEN
                                            </span>
                                        )}
                                </div>
                                <span
                                    className="text-xs text-primary-grey-dark"
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
                </div>
            </div>
        </div>
    )
}

export default AccountDisplayDragDrop
