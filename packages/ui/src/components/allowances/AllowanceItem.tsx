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

    const formattedTokenAllowance = formatUnits(
        allowance.value || "0",
        token.decimals
    )

    const roundedTokenAllowance = formatRounded(formattedTokenAllowance, 5)

    const allowanceValue = allowance.isUnlimited
        ? `Unlimited ${token.symbol}`
        : `${roundedTokenAllowance} ${token.symbol}`

    const logo = showToken ? token.logo : spender.logo

    const options = [
        {
            title: "Transaction Hash",
            link:
                allowance.txHash &&
                generateExplorerLink(
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
        <div
            onClick={() => {
                if (!isHoveringButton) setOpen(true)
            }}
            className={classnames(
                "flex flex-row items-center justify-between p-4 transition duration-300 bg-white dark:bg-gray-800",
                !isHoveringButton &&
                !open &&
                "hover:cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700"
            )}
        >
            <DetailsDialog
                open={open}
                fixedTitle
                titleSize="text-base"
                itemTitleSize="text-sm"
                itemContentSize="text-xs"
                title="Allowance Details"
                onClose={() => {
                    setOpen(false)
                }}
                options={options}
                expandedByDefault
            />

            <div className="flex flex-row items-center flex-1 min-w-0">
                <TokenLogo
                    logo={logo}
                    name={(showToken ? token.symbol : spender.symbol) ?? ""}
                    logoSize="big"
                    filled={false}
                />
                <div className="flex flex-col ml-3 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <span
                            className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate"
                            title={name}
                        >
                            {name}
                        </span>
                        {spender.websiteURL && (
                            <HiExternalLink className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        )}
                    </div>

                    <div className="flex items-center space-x-2 mt-1">
                        <span
                            className={classnames(
                                "text-xs font-medium flex items-center space-x-1",
                                allowance.isUnlimited
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-gray-600 dark:text-gray-400"
                            )}
                            title={allowanceValue}
                        >
                            {allowance.isUnlimited && (
                                <BiInfinite className="w-3 h-3" />
                            )}
                            <span className="truncate max-w-32">
                                {allowanceValue}
                            </span>
                        </span>

                        {isPendingUpdate && (
                            <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                                <HiClock className="w-3 h-3" />
                                <span>Updating</span>
                            </div>
                        )}
                    </div>

                    {allowance.txTime && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Last updated: {new Date(allowance.txTime).toLocaleDateString()}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-row items-center ml-4 space-x-3">
                {isPendingUpdate ? (
                    <ButtonWithLoading
                        isLoading={true}
                        label="Updating"
                        spinnerSize="12"
                        buttonClass={classnames(
                            Classes.smallButton,
                            "px-3 py-1.5 text-xs",
                            "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 pointer-events-none"
                        )}
                    />
                ) : (
                    <button
                        {...getIsHoveringProps()}
                        onClick={revoke}
                        className={classnames(
                            "flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                            "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800",
                            "hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700",
                            "active:bg-red-200 dark:active:bg-red-900/40",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                        disabled={isPendingUpdate}
                        title="Revoke this allowance"
                    >
                        <HiTrash className="w-3 h-3" />
                        <span>Revoke</span>
                    </button>
                )}

                <ChevronRightIcon />
            </div>
        </div>
    )
}

export default AllowanceItem
