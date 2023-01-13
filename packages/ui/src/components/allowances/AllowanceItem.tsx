import { useState } from "react"
import { TokenAllowance } from "@block-wallet/background/controllers/AccountTrackerController"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { BigNumber } from "ethers"
import { Classes, classnames } from "../../styles"
import ChevronRightIcon from "../icons/ChevronRightIcon"
import AllowanceIcon from "./AllowanceIcon"
import revokeIcon from "../../assets/images/icons/revoke.svg"
import useIsHovering from "../../util/hooks/useIsHovering"
import { getAllowanceValue } from "../../util/getAllowanceValue"
import DetailsDialog from "../dialog/DetailsDialog"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { ApproveOperation } from "../../routes/transaction/ApprovePage"

const AllowanceItem = ({
    allowance,
    token,
    spender,
    showToken = true,
}: {
    allowance: TokenAllowance
    token: Token
    spender: { name: string; address: string; logo: string }
    showToken?: boolean
}) => {
    const history = useOnMountHistory()

    const [open, setOpen] = useState(false)
    const { isHovering: isHoveringButton, getIsHoveringProps } = useIsHovering()

    const revoke = () => {
        history.push({
            pathname: "/transaction/approve",
            state: {
                assetAddress: token.address,
                approveOperation: ApproveOperation.REVOKE,
                spenderAddress: spender.address,
            },
        })
    }

    const name = showToken ? token.name : spender.name

    const allowanceValue =
        getAllowanceValue(BigNumber.from(allowance.value)._hex) +
        " " +
        token.symbol

    const logo = showToken ? token.logo : spender.logo

    const options = [
        {
            title: "Spender Name",
            content: spender.name,
        },
        {
            title: "Spender Address",
            content: spender.address,
            expandable: true,
        },
        {
            title: "Allowance Value",
            content:
                getAllowanceValue(BigNumber.from(allowance.value)._hex) +
                " " +
                token?.symbol,
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
                "flex flex-row items-center justify-between py-4 mr-1 transition duration-300 cursor-pointer -ml-6 px-6",
                !isHoveringButton &&
                    "hover:bg-primary-100 hover:bg-opacity-50 active:bg-primary-200 active:bg-opacity-50"
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
