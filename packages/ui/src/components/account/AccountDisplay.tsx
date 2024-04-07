import { useState } from "react"
import { FunctionComponent } from "react"

import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import {
    formatName,
    formatHash,
    formatHashLastChars,
} from "../../util/formatAccount"
import { getAccountColor } from "../../util/getAccountColor"

import AccountIcon from "../icons/AccountIcon"
import checkmarkIcon from "../../assets/images/icons/checkmark_mini.svg"
import { classnames } from "../../styles"
import ConfirmDialog, { ConfirmDialogState } from "../dialog/ConfirmDialog"
import CopyTooltip from "../label/СopyToClipboardTooltip"
import useIsHovering from "../../util/hooks/useIsHovering"
import {
    AccountDisplayMenuOption,
    AccountMenuOptionMetadata,
    getAccountMenuOptionMetadata,
} from "./AccountDisplayMenu"
import Tag from "../ui/Tag"
import { isInternalAccount } from "../../util/account"
import useCopyToClipboard from "../../util/hooks/useCopyToClipboard"
import Dropdown from "../ui/Dropdown/Dropdown"
import { useAddressWithChainIdChecksum } from "../../util/hooks/useSelectedAddressWithChainIdChecksum"
import useNetWorthBalance from "../../context/hooks/useNetWorthBalance"

interface AccountDisplayProps {
    account: AccountInfo
    selected?: boolean
    showSelectedCheckmark?: boolean
    showAddress?: boolean
    truncateName?: boolean
    showConnected?: boolean
    copyAddressToClipboard?: boolean
    menu?: AccountDisplayMenuOption[]
    actionButtons?: JSX.Element[]
    onClickAccount?: (account: AccountInfo) => void
    className?: string
}

const AccountDisplay: FunctionComponent<AccountDisplayProps> = ({
    account,
    selected,
    showSelectedCheckmark = true,
    showAddress = false,
    truncateName = true,
    showConnected = false,
    copyAddressToClipboard = false,
    actionButtons,
    menu,
    onClickAccount,
    className,
}) => {
    const [confirmationDialog, setConfirmationDialog] =
        useState<ConfirmDialogState>({ open: false })
    const { isHovering: isHoveringMenu, getIsHoveringProps } = useIsHovering()
    const checksumAddress = useAddressWithChainIdChecksum(account?.address)
    const {
        displayNetWorth,
        netWorth,
        nativeTokenBalance,
        nativeTokenBalanceRounded,
    } = useNetWorthBalance(!showAddress ? account : undefined)

    const { copied, onCopy } = useCopyToClipboard(checksumAddress)

    const handleOptionClick = (optionMetadata: AccountMenuOptionMetadata) => {
        if (!optionMetadata.requiresConfirmation) {
            return optionMetadata.handler!(checksumAddress)
        }
        setConfirmationDialog({
            onConfirm: () => optionMetadata.handler!(checksumAddress),
            open: true,
            title: optionMetadata.confirmationTitle,
            message: optionMetadata.confirmationMessage,
        })
    }

    const hoverStyle =
        onClickAccount && !selected && !actionButtons && !isHoveringMenu

    const accountName = formatName(account.name, showAddress ? 25 : 25)

    return (
        <>
            <div
                className={classnames(
                    "flex flex-row items-center justify-between w-full rounded-lg",
                    hoverStyle &&
                        "hover:bg-primary-grey-default cursor-pointer",
                    confirmationDialog.open && "!cursor-default",
                    className
                )}
                onClick={() => onClickAccount && onClickAccount(account)}
                role="button"
                aria-label={accountName}
            >
                <div
                    className="flex flex-row items-center space-x-3 text-gray-900 p-2"
                    role="link"
                    data-testid="account-icon"
                >
                    <AccountIcon
                        className="w-10 h-10"
                        fill={getAccountColor(checksumAddress)}
                    />
                    <div className="flex flex-col">
                        <div
                            className={classnames(
                                "relative flex flex-col items-start group",
                                copyAddressToClipboard && "cursor-pointer"
                            )}
                            onClick={() => copyAddressToClipboard && onCopy()}
                        >
                            <div className="flex flex-row space-x-1">
                                <label
                                    className={classnames(
                                        "font-semibold",
                                        truncateName &&
                                            "truncate max-w-[140px]",
                                        hoverStyle && "cursor-pointer"
                                    )}
                                    title={account.name}
                                    htmlFor={`check-account-${checksumAddress}`}
                                >
                                    {accountName}
                                </label>
                                {!showAddress && (
                                    <span
                                        className="font-semibold"
                                        title={checksumAddress}
                                    >
                                        {formatHashLastChars(checksumAddress)}
                                    </span>
                                )}
                            </div>
                            {!showAddress ? (
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
                            ) : (
                                <span className="text-xs text-primary-grey-dark">
                                    {formatHash(checksumAddress)}
                                </span>
                            )}
                            {copyAddressToClipboard && (
                                <CopyTooltip copied={copied} />
                            )}
                        </div>
                        {(!isInternalAccount(account.accountType) ||
                            showConnected) && (
                            <div className="flex flex-row space-x-1 text-xxs text-white pt-1">
                                {account.accountType && (
                                    <Tag profile="dark">
                                        <span className="font-semibold">
                                            {account.accountType.toString()}
                                        </span>
                                    </Tag>
                                )}

                                {showConnected && (
                                    <Tag profile="success">Connected</Tag>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex flex-row items-center space-x-2">
                    {selected && showSelectedCheckmark ? (
                        <img
                            src={checkmarkIcon}
                            alt="checkmark"
                            className="w-4 h-4"
                        />
                    ) : null}

                    {actionButtons}
                    {menu && (
                        <div {...getIsHoveringProps()}>
                            <Dropdown>
                                <Dropdown.Menu id="account-menu">
                                    {menu.map((menuItem, indx) => {
                                        const optionMenuMetadata =
                                            getAccountMenuOptionMetadata(
                                                menuItem,
                                                account
                                            )
                                        return (
                                            <Dropdown.MenuItem
                                                key={`${menuItem.optionType}_${indx}`}
                                                className="p-2"
                                                onClick={() =>
                                                    handleOptionClick(
                                                        optionMenuMetadata
                                                    )
                                                }
                                            >
                                                <optionMenuMetadata.Component
                                                    key={menuItem.optionType}
                                                    disabled={menuItem.disabled}
                                                />
                                            </Dropdown.MenuItem>
                                        )
                                    })}
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    )}
                </div>
            </div>
            <ConfirmDialog
                title={confirmationDialog.title || ""}
                message={confirmationDialog.message || ""}
                open={confirmationDialog.open}
                onClose={() => setConfirmationDialog({ open: false })}
                onConfirm={confirmationDialog.onConfirm!}
            />
        </>
    )
}

export default AccountDisplay
