import { BigNumber } from "@ethersproject/bignumber"
import { useEffect, useRef, useState } from "react"

import {
    addNewApproveTransaction,
    refreshTokenAllowances,
} from "../../context/commActions"
import useAccountAllowances from "../../context/hooks/useAccountAllowances"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

import AllowancesFilterButton, {
    AllowancesFilters,
} from "../../components/allowances/AllowancesFilterButton"
import SearchInput from "../../components/input/SearchInput"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import EmptyState from "../../components/ui/EmptyState"
import AllowancesRefetchButton from "../../components/allowances/AllowancesRefetchButton"
import AllowanceList from "../../components/allowances/AllowanceList"
import PopupFooter from "../../components/popup/PopupFooter"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import ConfirmDialog from "../../components/dialog/ConfirmDialog"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"

export type AllowancePageLocalState = {
    fromAssetDetails: boolean
    address?: string
    tab: "Allowances"
    groupBy: AllowancesFilters
    toRevoke?: allowancesToRevoke
}

type allowancesToRevoke = {
    assetAddress: string
    spenderAddress: string
}[]

const AllowancesPage = () => {
    const history = useOnMountHistory()

    const searchInputRef = useRef<HTMLInputElement>(null)

    const [search, setSearch] = useState("")
    const [showEmptyState, setShowEmptyState] = useState(false)
    const [confirmRevokeAll, setConfirmRevokeAll] = useState(false)
    const [confirmRefresh, setConfirmRefresh] = useState(false)
    const [isRefreshDisabled, setIsRefreshDisabled] = useState(false)
    const [groupBy, setGroupBy] = useState<AllowancesFilters>(
        history.location.state?.groupBy || AllowancesFilters.SPENDER
    )

    const allowances = useAccountAllowances(groupBy, search)!

    const [toRevokeCount, setToRevokeCount] = useState(
        allowances.reduce(
            (count, groupedAllowances) =>
                count + groupedAllowances.allowances.length,
            0
        )
    )

    const { isOpen, status, dispatch } = useWaitingDialog()

    const revokeAll = async () => {
        const groupedBySpender = groupBy === AllowancesFilters.SPENDER
        const allowancesToRevoke = allowances.flatMap((groupedAllowances) =>
            groupedAllowances.allowances.map((allowance) => ({
                assetAddress: groupedBySpender
                    ? allowance.displayData.address
                    : groupedAllowances.groupBy.address,
                spenderAddress: groupedBySpender
                    ? groupedAllowances.groupBy.address
                    : allowance.displayData.address,
            }))
        )

        await Promise.all(
            allowancesToRevoke.map(({ assetAddress, spenderAddress }) =>
                addNewApproveTransaction(
                    assetAddress,
                    spenderAddress,
                    BigNumber.from(0)
                )
            )
        )

        history.push({
            pathname: "/approveAsset",
            state: {
                from: "/accounts/menu/allowances",
                fromState: { groupBy },
            },
        })
    }

    const refetchAllowances = async () => {
        if (!isRefreshDisabled) {
            setIsRefreshDisabled(true)
            setTimeout(() => {
                setIsRefreshDisabled(false)
            }, 5 * 60 * 1000)
            await refreshTokenAllowances()
        }
    }

    const onFilterChange = (filter: AllowancesFilters) => {
        setGroupBy(filter)
        setSearch("")
        if (searchInputRef.current) {
            searchInputRef.current.value = ""
        }
    }

    useEffect(() => {
        setToRevokeCount(
            allowances.reduce(
                (count, groupedAllowances) =>
                    count + groupedAllowances.allowances.length,
                0
            )
        )
        setShowEmptyState(allowances.length === 0)
    }, [allowances])

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Allowances"
                    tooltip={{
                        link: "https://help.blockwallet.io/hc/en-us/articles/12519699592081",
                        content: (
                            <div className="font-normal text-xs text-white-500">
                                Click to learn about allowances.
                            </div>
                        ),
                    }}
                    networkIndicator
                    close
                    onBack={() => history.push("/accounts/menu")}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Revoke All"
                        onClick={() => setConfirmRevokeAll(true)}
                        disabled={allowances.length === 0}
                    />
                </PopupFooter>
            }
        >
            <ConfirmDialog
                title="Revoke All Allowances"
                message={`You will revoke all the currently visible allowances (${toRevokeCount}). You will need to confirm each action in sequence.`}
                open={confirmRevokeAll}
                onClose={() => setConfirmRevokeAll(false)}
                onConfirm={() => {
                    setConfirmRevokeAll(false)
                    revokeAll()
                }}
            />
            <ConfirmDialog
                title="Refresh Allowances"
                message="Your token allowances are refreshed automatically. If you think they are not up to date, you can manually refresh them once every 5 minutes."
                open={confirmRefresh}
                onClose={() => setConfirmRefresh(false)}
                onConfirm={async () => {
                    dispatch({
                        type: "open",
                        payload: { status: "loading" },
                    })
                    await refetchAllowances()
                    dispatch({
                        type: "setStatus",
                        payload: { status: "success" },
                    })
                }}
            />
            <WaitingDialog
                status={status}
                open={isOpen}
                titles={{
                    loading: "Refreshing allowances...",
                    error: "Error",
                    success: "Success!",
                }}
                texts={{
                    loading:
                        "Please wait while the allowances is being refreshed...",
                    error: "There was an error while refreshing your allowances",
                    success: `Refresh allowances was successful.`,
                }}
                onDone={() => {
                    dispatch({ type: "close" })
                }}
                timeout={1100}
            />
            <div className="w-76 w-full p-6 bg-white fixed z-0 flex flex-col">
                <div className="flex flex-row space-x-2">
                    <div className="flex-1">
                        <SearchInput
                            inputClassName="!h-12"
                            placeholder={`Search`}
                            onChange={(event) => setSearch(event.target.value)}
                            debounced
                            defaultValue={search}
                            ref={searchInputRef}
                        />
                    </div>
                    <AllowancesFilterButton
                        filter={groupBy}
                        onChangeFilter={onFilterChange}
                    />
                    <AllowancesRefetchButton
                        onClick={() => setConfirmRefresh(true)}
                        disabled={isRefreshDisabled}
                    />
                </div>
                {showEmptyState && (
                    <EmptyState
                        title={search ? "No results" : "No allowances"}
                        className="p-6 mt-16"
                    >
                        {search
                            ? "The allowances you are searching for does not exist. Try adjusting your search."
                            : "You currently have no allowances. Make sure you are on the right network."}
                    </EmptyState>
                )}
            </div>
            <div className="flex flex-col h-full w-full p-6">
                <div className="w-full mt-16 pt-2 h-full space-y-6">
                    <AllowanceList allowances={allowances} />
                </div>
            </div>
        </PopupLayout>
    )
}

export default AllowancesPage
