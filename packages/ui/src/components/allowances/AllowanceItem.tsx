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

import { AssetIcon } from "../AssetsList"
import { AllowancesFilters } from "./AllowancesFilterButton"
import { TabLabels } from "../assets/ActivityAllowancesView"
import DetailsDialog from "../dialog/DetailsDialog"

import ChevronRightIcon from "../icons/ChevronRightIcon"
import revokeIcon from "../../assets/images/icons/revoke.svg"

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
                "flex flex-row items-center justify-between py-4 mr-1 transition duration-300 -ml-6 px-6 w-[calc(100%+3rem)]",
                !isHoveringButton &&
                    !open &&
                    "hover:cursor-pointer hover:bg-primary-100 hover:bg-opacity-50 active:bg-primary-200 active:bg-opacity-50"
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
            <div className="flex flex-row items-center">
                <AssetIcon asset={{ logo: logo, symbol: name }} />
                <div className="flex flex-col ml-2">
                    <span
                        className="text-sm font-bold truncate w-36"
                        title={name}
                    >
                        {name}
                    </span>
                    <span
                        className="text-xs text-gray-600 w-32 truncate"
                        title={allowanceValue}
                    >
                        {allowanceValue}
                    </span>
                </div>
            </div>

            <div className="flex flex-row items-center pr-2">
                <button
                    {...getIsHoveringProps()}
                    onClick={revoke}
                    className={classnames(
                        Classes.smallButton,
                        "flex space-x-2 font-semibold mr-4"
                    )}
                >
                    <img
                        width="13"
                        height="13"
                        src={revokeIcon}
                        alt="Revoke"
                        className="mr-2"
                    />
                    Revoke
                </button>
                <ChevronRightIcon />
            </div>
        </div>
    )
}

export default AllowanceItem
