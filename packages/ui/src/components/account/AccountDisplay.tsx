import { useState } from "react"
import { FunctionComponent } from "react"

import { formatUnits } from "@ethersproject/units"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import {
    formatName,
    formatHash,
    formatHashLastChars,
} from "../../util/formatAccount"
import { getAccountColor } from "../../util/getAccountColor"
import { formatNumberLength } from "../../util/formatNumberLength"

import AccountIcon from "../icons/AccountIcon"
import checkmarkIcon from "../../assets/images/icons/checkmark_mini.svg"
import { classnames } from "../../styles"
import ConfirmDialog from "../dialog/ConfirmDialog"
import CopyTooltip from "../label/СopyToClipboardTooltip"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
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
import { toChecksumAddress } from "ethereumjs-util"
import { useAddressWithChainIdChecksum } from "../../util/hooks/useSelectedAddressWithChainIdChecksum"

interface ConfirmDialogState {
    isOpen: boolean
    onConfirm?: () => void
    title?: string
    message?: string
}

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
}) => {
    const [confirmationDialog, setConfirmationDialog] =
        useState<ConfirmDialogState>({ isOpen: false })
    const { isHovering: isHoveringMenu, getIsHoveringProps } = useIsHovering()
    const { chainId, nativeCurrency } = useSelectedNetwork()
    const checksumAddress = useAddressWithChainIdChecksum(account?.address)

    const { copied, onCopy } = useCopyToClipboard(checksumAddress)

    const handleOptionClick = (optionMetadata: AccountMenuOptionMetadata) => {
        if (!optionMetadata.requiresConfirmation) {
            return optionMetadata.handler!(checksumAddress)
        }
        setConfirmationDialog({
            onConfirm: () => optionMetadata.handler!(checksumAddress),
            isOpen: true,
            title: optionMetadata.confirmationTitle,
            message: optionMetadata.confirmationMessage,
        })
    }

    const nativeTokenBalance =
        (account.balances && account.balances[chainId]?.nativeTokenBalance) ??
        "0"

    const hoverStyle =
        onClickAccount && !selected && !actionButtons && !isHoveringMenu

    const accountName = formatName(account.name, showAddress ? 25 : 18)

    return (
        <>
            <div
                className={classnames(
                    "flex flex-row items-center justify-between w-full rounded-md",
                    hoverStyle &&
                        "hover:bg-primary-grey-default cursor-pointer",
                    confirmationDialog.isOpen && "!cursor-default"
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
                                        "font-bold",
                                        truncateName && "truncate max-w-[96px]",
                                        hoverStyle && "cursor-pointer"
                                    )}
                                    title={account.name}
                                    htmlFor={`check-account-${checksumAddress}`}
                                >
                                    {accountName}
                                </label>
                                {!showAddress && (
                                    <span
                                        className="font-bold"
                                        title={checksumAddress}
                                    >
                                        {formatHashLastChars(checksumAddress)}
                                    </span>
                                )}
                            </div>
                            {!showAddress ? (
                                <span
                                    className="text-gray-500"
                                    title={`${formatUnits(
                                        nativeTokenBalance
                                    )} ${nativeCurrency.symbol}`}
                                >
                                    {formatNumberLength(
                                        formatUnits(nativeTokenBalance),
                                        10
                                    )}{" "}
                                    {nativeCurrency.symbol}
                                </span>
                            ) : (
                                <span className="text-gray-500">
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
                                        <span className="font-bold">
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
                <div className="flex flex-row items-center space-x-3">
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
                open={confirmationDialog.isOpen}
                onClose={() => setConfirmationDialog({ isOpen: false })}
                onConfirm={confirmationDialog.onConfirm!}
            />
        </>
    )
}

export default AccountDisplay
