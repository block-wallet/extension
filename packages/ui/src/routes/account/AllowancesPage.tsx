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
import useLocalStorageState from "../../util/hooks/useLocalStorageState"
import { useHotkeys } from "react-hotkeys-hook"
import { useBlankState } from "../../context/background/backgroundHooks"
import { componentsHotkeys } from "../../util/hotkeys"

// Icons
import { HiShieldCheck, HiInformationCircle, HiExclamation, HiRefresh, HiSearch, HiTrash } from "react-icons/hi"
import { BsShield } from "react-icons/bs"

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

const timeToDisableRefresh = 5 * 60 * 1000

const AllowancesPage = () => {
    const history = useOnMountHistory()
    const { hotkeysEnabled } = useBlankState()!
    const searchInputRef = useRef<HTMLInputElement>(null)

    const [search, setSearch] = useState("")
    const [showEmptyState, setShowEmptyState] = useState(false)
    const [confirmRevokeAll, setConfirmRevokeAll] = useState(false)
    const [confirmRefresh, setConfirmRefresh] = useState(false)
    const [persistedData, setPersistedData] = useLocalStorageState(
        "allowances.refresh",
        {
            initialValue: {
                lastTriggered: 0,
            },
            volatile: false,
        }
    )

    const refreshDisabledUntil = new Date(
        persistedData.lastTriggered + timeToDisableRefresh
    )

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

    const {
        isOpen: isRefreshingAllowances,
        status: refreshingAllowancesStatus,
        dispatch: refreshingAllowancesDispatch,
    } = useWaitingDialog()

    const {
        isOpen: isRevokingAllowances,
        status: revokingAllowancesStatus,
        dispatch: revokingAllowancesDispatch,
    } = useWaitingDialog()

    const revokeAll = async () => {
        revokingAllowancesDispatch({
            type: "open",
            payload: { status: "loading" },
        })
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
        await refreshTokenAllowances()
        setPersistedData({
            lastTriggered: Date.now(),
        })
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

    const allowancesPageHotkeys = componentsHotkeys.AllowancesPage
    useHotkeys(allowancesPageHotkeys, (e) => {
        if (!hotkeysEnabled) return
        if (!e.key) {
            return
        }
        const keyPressed = e.code
            .replace(/key/i, "")
            .replace(/digit/i, "")
            .replace(/numpad/i, "")
            .toLowerCase()

        switch (keyPressed) {
            case "r":
                setConfirmRefresh(true)
                break
            case "s":
                onFilterChange(AllowancesFilters.SPENDER)
                break
            case "t":
                onFilterChange(AllowancesFilters.TOKEN)
                break
        }
    })

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Token Allowances"
                    tooltip={{
                        link: "https://blockwallet.io/docs/revoke-token-allowances",
                        content: (
                            <div className="font-normal text-xs text-white dark:text-gray-200">
                                Click to learn about token allowances and security.
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
                        label={`Revoke All${toRevokeCount > 0 ? ` (${toRevokeCount})` : ''}`}
                        onClick={() => setConfirmRevokeAll(true)}
                        disabled={allowances.length === 0}
                    />
                </PopupFooter>
            }
            showProviderStatus
        >
            <ConfirmDialog
                title="Revoke All Allowances"
                message={`You will revoke all the currently visible allowances (${toRevokeCount}). This will create ${toRevokeCount} transaction(s) that you'll need to confirm in sequence. Each transaction will cost gas fees.`}
                open={confirmRevokeAll}
                onClose={() => setConfirmRevokeAll(false)}
                onConfirm={() => {
                    setConfirmRevokeAll(false)
                    revokeAll()
                }}
            />
            <ConfirmDialog
                title="Refresh Allowances"
                message="Your token allowances are refreshed automatically. If you think they are not up to date, you can manually refresh them once every 5 minutes. This will scan your wallet for all current allowances."
                open={confirmRefresh}
                onClose={() => setConfirmRefresh(false)}
                onConfirm={async () => {
                    refreshingAllowancesDispatch({
                        type: "open",
                        payload: { status: "loading" },
                    })
                    await refetchAllowances()
                    refreshingAllowancesDispatch({
                        type: "setStatus",
                        payload: { status: "success" },
                    })
                }}
                confirmDisabledUntil={refreshDisabledUntil}
            />
            <WaitingDialog
                status={refreshingAllowancesStatus}
                open={isRefreshingAllowances}
                titles={{
                    loading: "Refreshing allowances...",
                    error: "Error",
                    success: "Success!",
                }}
                texts={{
                    loading:
                        "Please wait while the allowances are being refreshed...",
                    error: "There was an error while refreshing your allowances",
                    success: `Allowances refresh was successful.`,
                }}
                onDone={() => {
                    refreshingAllowancesDispatch({ type: "close" })
                }}
                timeout={1000}
            />
            <WaitingDialog
                status={revokingAllowancesStatus}
                open={isRevokingAllowances}
                titles={{
                    loading: "Preparing transactions...",
                    error: "Error",
                    success: "Success!",
                }}
                texts={{
                    loading:
                        "Please wait while we prepare and queue your allowance revokes...",
                    error: "There was an error while revoking your allowances",
                    success: `Revoke transactions prepared successfully.`,
                }}
                onDone={() => {
                    revokingAllowancesDispatch({ type: "close" })
                }}
                timeout={1000}
            />

            {/* Main Content Area */}
            <div className="flex flex-col h-full bg-white dark:bg-gray-900">
                {/* Header Section with Education */}
                <div className="p-6 space-y-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center border border-amber-200 dark:border-amber-800">
                            <HiShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                Manage Token Allowances
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Review and revoke permissions you've granted to dApps and smart contracts.
                                Revoking unused allowances helps protect your tokens from unauthorized access.
                            </p>
                        </div>
                    </div>

                    {/* Search and Filter Controls */}
                    <div className="flex flex-row space-x-2">
                        <div className="flex-1">
                            <SearchInput
                                inputClassName="!h-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                placeholder={`Search ${groupBy === AllowancesFilters.SPENDER ? 'spenders' : 'tokens'}...`}
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
                        />
                    </div>

                    {/* Quick Stats */}
                    {allowances.length > 0 && (
                        <div className="flex items-center justify-between pt-2">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {toRevokeCount}
                                </span> allowance{toRevokeCount !== 1 ? 's' : ''} found
                                {search && ` for "${search}"`}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Grouped by {groupBy === AllowancesFilters.SPENDER ? 'spender' : 'token'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto">
                    {showEmptyState ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6 space-y-6">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                {search ? (
                                    <HiSearch className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                ) : (
                                    <BsShield className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                )}
                            </div>
                            <div className="text-center space-y-3 max-w-sm">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {search ? "No Results Found" : "No Allowances"}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {search
                                        ? `No allowances match "${search}". Try adjusting your search or changing the filter.`
                                        : "You currently have no token allowances. When you approve tokens for dApps or smart contracts, they'll appear here."}
                                </p>
                                {search && (
                                    <button
                                        onClick={() => {
                                            setSearch("")
                                            if (searchInputRef.current) {
                                                searchInputRef.current.value = ""
                                            }
                                        }}
                                        className="text-sm text-primary-blue-default dark:text-primary-blue-400 hover:underline"
                                    >
                                        Clear search
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-6">
                            <AllowanceList allowances={allowances} />
                        </div>
                    )}
                </div>

                {/* Security Information */}
                {!showEmptyState && (
                    <div className="p-6 space-y-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                            <div className="flex items-start space-x-3">
                                <HiInformationCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                        Security Best Practices
                                    </h3>
                                    <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                        <li>• Regularly review and revoke unused allowances</li>
                                        <li>• Only grant allowances to trusted dApps and contracts</li>
                                        <li>• Consider using limited allowances instead of unlimited ones</li>
                                        <li>• Revoke allowances before discontinuing use of a dApp</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
                            <div className="flex items-start space-x-3">
                                <HiExclamation className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                        Important Note
                                    </h3>
                                    <p className="text-xs text-amber-800 dark:text-amber-200">
                                        Revoking allowances requires gas fees. Each revoke action creates a separate transaction that must be confirmed.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PopupLayout>
    )
}

export default AllowancesPage
