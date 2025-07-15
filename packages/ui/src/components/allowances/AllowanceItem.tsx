import { BigNumber } from "@ethersproject/bignumber"
import { useState } from "react"
import { formatUnits } from "@ethersproject/units"
import { TokenAllowance } from "@block-wallet/background/controllers/AccountTrackerController"
import { Classes, classnames } from "../../styles"

import { useBlankState } from "../../context/background/backgroundHooks"
import { AllowanceDisplayData } from "../../context/hooks/useAccountAllowances"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { addNewApproveTransaction } from "../../context/commActions"
import useIsHovering from "../../util/hooks/useIsHovering"
import { generateExplorerLink } from "../../util/getExplorer"
import { formatRounded } from "../../util/formatRounded"

import { AllowancesFilters } from "./AllowancesFilterButton"
import { TabLabels } from "../assets/ActivityAllowancesView"
import DetailsDialog from "../dialog/DetailsDialog"

import ChevronRightIcon from "../icons/ChevronRightIcon"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import { TokenAllowanceStatus } from "../../context/commTypes"
import TokenLogo from "../token/TokenLogo"
import { themeColors, cn } from "../../styles/theme"

// Icons
import { HiTrash, HiExternalLink, HiClock } from "react-icons/hi"
import { BiInfinite } from "react-icons/bi"

const AllowanceItem = ({
    allowance,
    token,
    spender,
    showToken = false,
    fromAssetDetails = false,
}: {
    allowance: TokenAllowance
    token: AllowanceDisplayData
    spender: AllowanceDisplayData
    showToken?: boolean
    fromAssetDetails?: boolean
}) => {
    const history = useOnMountHistory()
    const { selectedNetwork, availableNetworks } = useBlankState()!

    const [open, setOpen] = useState(false)
    const [isRevokeDisabled, setIsRevokeDisabled] = useState(false)

    const { isHovering: isHoveringButton, getIsHoveringProps } = useIsHovering()

    const isPendingUpdate =
        allowance.status === TokenAllowanceStatus.AWAITING_TRANSACTION_RESULT ||
        isRevokeDisabled

    const revoke = async () => {
        if (!isRevokeDisabled) {
            setIsRevokeDisabled(true)

            await addNewApproveTransaction(
                token.address,
                spender.address,
                BigNumber.from(0)
            )

            history.push({
                pathname: "/approveAsset",
                state: {
                    from: fromAssetDetails
                        ? "/asset/details"
                        : "/accounts/menu/allowances",
                    fromState: {
                        groupBy: showToken
                            ? AllowancesFilters.SPENDER
                            : AllowancesFilters.TOKEN,
                        address: token.address,
                        tab: TabLabels.ALLOWANCES,
                    },
                },
            })
        }
    }

    const name = showToken ? token.name : spender.name
    const formattedTokenAllowance = formatUnits(allowance.value || "0", token.decimals)
    const roundedTokenAllowance = formatRounded(formattedTokenAllowance, 5)
    const allowanceValue = allowance.isUnlimited
        ? `Unlimited ${token.symbol}`
        : `${roundedTokenAllowance} ${token.symbol}`
    const logo = showToken ? token.logo : spender.logo

    const options = [
        {
            title: "Transaction Hash",
            link: allowance.txHash && generateExplorerLink(
                availableNetworks,
                selectedNetwork,
                allowance.txHash,
                "tx"
            ),
            content: allowance.txHash,
            copyable: true,
        },
        {
            title: "Last Updated",
            content: allowance.txTime
                ? new Date(allowance.txTime).toLocaleString()
                : undefined,
        },
        {
            title: "Spender Name",
            content: spender.name?.includes("Spender (...")
                ? undefined
                : spender.name,
        },
        {
            title: "Spender Address",
            link: generateExplorerLink(
                availableNetworks,
                selectedNetwork,
                spender.address,
                "address"
            ),
            content: spender.address,
            copyable: true,
        },
        {
            title: "Spender Website",
            content: spender.websiteURL,
            copyable: true,
        },
        {
            title: "Allowance Value",
            content: allowanceValue,
        },
        {
            title: "Token Name",
            content: token.name,
        },
        {
            title: "Token Symbol",
            content: token.symbol,
        },
        {
            title: "Token Address",
            link: generateExplorerLink(
                availableNetworks,
                selectedNetwork,
                token.address,
                "address"
            ),
            content: token.address,
            copyable: true,
        },
    ]

    return (
        <>
            <DetailsDialog
                open={open}
                fixedTitle
                titleSize="text-base"
                itemTitleSize="text-sm"
                itemContentSize="text-xs"
                title="Allowance Details"
                onClose={() => setOpen(false)}
                options={options}
                expandedByDefault
            />

            <div
                onClick={() => {
                    if (!isHoveringButton) setOpen(true)
                }}
                className={cn(
                    "group relative flex items-center justify-between px-6 py-4",
                    "bg-white dark:bg-gray-900 transition-all duration-200",
                    "border-b border-gray-100 dark:border-gray-800 last:border-b-0",
                    !isHoveringButton && !open && "cursor-pointer",
                    !isHoveringButton && !open && "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                    !isHoveringButton && !open && "active:bg-gray-100 dark:active:bg-gray-800"
                )}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${name} allowance`}
                onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isHoveringButton) {
                        e.preventDefault()
                        setOpen(true)
                    }
                }}
            >
                {/* Main Content */}
                <div className="flex items-center flex-1 min-w-0 space-x-4">
                    {/* Token/Spender Logo */}
                    <div className="flex-shrink-0">
                        <TokenLogo
                            logo={logo}
                            name={(showToken ? token.symbol : spender.symbol) ?? ""}
                            logoSize="big"
                            filled={false}
                        />
                    </div>

                    {/* Information */}
                    <div className="flex-1 min-w-0 space-y-1">
                        {/* Primary Info Line */}
                        <div className="flex items-center space-x-2">
                            <h3
                                className={cn(
                                    "text-sm font-semibold truncate",
                                    themeColors.text.primary
                                )}
                                title={name}
                            >
                                {name}
                            </h3>
                            {spender.websiteURL && (
                                <HiExternalLink
                                    className={cn(
                                        "w-3 h-3 flex-shrink-0",
                                        themeColors.text.tertiary
                                    )}
                                />
                            )}
                        </div>

                        {/* Allowance Value */}
                        <div className="flex items-center space-x-2">
                            <div
                                className={cn(
                                    "flex items-center space-x-1 text-xs font-medium",
                                    allowance.isUnlimited
                                        ? "text-amber-600 dark:text-amber-400"
                                        : themeColors.text.secondary
                                )}
                                title={allowanceValue}
                            >
                                {allowance.isUnlimited && (
                                    <BiInfinite className="w-3 h-3 flex-shrink-0" />
                                )}
                                <span className="truncate max-w-32">
                                    {allowanceValue}
                                </span>
                            </div>

                            {/* Pending Status Badge */}
                            {isPendingUpdate && (
                                <div className={cn(
                                    "flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                    "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
                                    "border border-blue-200 dark:border-blue-800"
                                )}>
                                    <HiClock className="w-3 h-3 animate-pulse" />
                                    <span>Updating</span>
                                </div>
                            )}
                        </div>

                        {/* Last Updated */}
                        {allowance.txTime && (
                            <div className={cn("text-xs", themeColors.text.tertiary)}>
                                Last updated: {new Date(allowance.txTime).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3 ml-4">
                    {/* Revoke Button */}
                    {isPendingUpdate ? (
                        <div className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium",
                            "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
                            "border border-blue-200 dark:border-blue-800",
                            "flex items-center space-x-1.5"
                        )}>
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Updating</span>
                        </div>
                    ) : (
                        <button
                            {...getIsHoveringProps()}
                            onClick={(e) => {
                                e.stopPropagation()
                                revoke()
                            }}
                            className={cn(
                                "flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg",
                                "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
                                "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
                                "border border-red-200 dark:border-red-800",
                                "hover:bg-red-100 dark:hover:bg-red-900/30",
                                "hover:border-red-300 dark:hover:border-red-700",
                                "hover:shadow-sm hover:scale-105",
                                "active:bg-red-200 dark:active:bg-red-900/40 active:scale-95",
                                "focus:ring-red-500 dark:focus:ring-red-400 focus:ring-offset-white dark:focus:ring-offset-gray-900",
                                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            )}
                            disabled={isPendingUpdate}
                            title="Revoke this allowance"
                            aria-label={`Revoke allowance for ${name}`}
                        >
                            <HiTrash className="w-3 h-3" />
                            <span>Revoke</span>
                        </button>
                    )}

                    {/* Details Arrow */}
                    <div className={cn(
                        "transition-transform duration-200 group-hover:translate-x-0.5",
                        themeColors.text.tertiary
                    )}>
                        <ChevronRightIcon />
                    </div>
                </div>

                {/* Hover Overlay for Visual Feedback */}
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-r from-transparent to-blue-50/10 dark:to-blue-900/10",
                    "opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                )} />
            </div>
        </>
    )
}

export default AllowanceItem
