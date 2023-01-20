import { useState } from "react"
import { TokenAllowance } from "@block-wallet/background/controllers/AccountTrackerController"
import { Classes, classnames } from "../../styles"
import ChevronRightIcon from "../icons/ChevronRightIcon"
import AllowanceIcon from "./AllowanceIcon"
import revokeIcon from "../../assets/images/icons/revoke.svg"
import useIsHovering from "../../util/hooks/useIsHovering"
import DetailsDialog from "../dialog/DetailsDialog"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { ApproveOperation } from "../../routes/transaction/ApprovePage"
import { AllowanceDisplayData } from "../../context/hooks/useAccountAllowances"
import { AllowancesFilters } from "./AllowancesFilterButton"
import { AllowancePageLocalState } from "../../routes/account/AllowancesPage"
import { formatUnits } from "ethers/lib/utils"
import { formatRounded } from "../../util/formatRounded"
import { generateExplorerLink } from "../../util/getExplorer"
import { useBlankState } from "../../context/background/backgroundHooks"

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
    const { isHovering: isHoveringButton, getIsHoveringProps } = useIsHovering()

    const revoke = () => {
        const AllowancePageState = {
            fromAssetDetails: fromAssetDetails,
            address: token.address,
            tab: "Allowances",
            groupBy: showToken
                ? AllowancesFilters.SPENDER
                : AllowancesFilters.TOKEN,
        } as AllowancePageLocalState

        history.push({
            pathname: "/transaction/approve",
            state: {
                assetAddress: token.address,
                approveOperation: ApproveOperation.REVOKE,
                spenderAddress: spender.address,
                nextLocationState: AllowancePageState,
            },
        })
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
            link: allowance.txHash
                ? generateExplorerLink(
                      availableNetworks,
                      selectedNetwork,
                      allowance.txHash!,
                      "tx"
                  )
                : undefined,
            content: allowance.txHash,
            expandable: true,
        },
        {
            title: "Spender Name",
            content: spender.name,
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
            expandable: true,
        },
        {
            title: "Allowance Value",
            content: allowanceValue,
            expandable: true,
        },
        {
            title: "Last Updated",
            content: new Date(allowance?.updatedAt).toLocaleString(),
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
            expandable: true,
        },
    ]

    return (
        <div
            onClick={() => {
                if (!isHoveringButton) setOpen(true)
            }}
            className={classnames(
                "flex flex-row items-center justify-between py-4 mr-1 transition duration-300 -ml-6 px-6",
                !isHoveringButton &&
                    !open &&
                    "hover:cursor-pointer hover:bg-primary-100 hover:bg-opacity-50 active:bg-primary-200 active:bg-opacity-50"
            )}
            style={{ width: "calc(100% + 3rem)" }}
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
                <AllowanceIcon name={name} logo={logo} />
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
