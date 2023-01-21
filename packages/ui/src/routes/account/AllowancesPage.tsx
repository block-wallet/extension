import { useEffect, useRef, useState } from "react"
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
import useAccountAllowances from "../../context/hooks/useAccountAllowances"
import ConfirmDialog from "../../components/dialog/ConfirmDialog"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { ApproveOperation } from "../transaction/ApprovePage"
import { refreshTokenAllowances } from "../../context/commActions"

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

    const [groupBy, setGroupBy] = useState<AllowancesFilters>(
        history.location.state?.groupBy || AllowancesFilters.SPENDER
    )

    const allowances = useAccountAllowances(groupBy, search)!

    const revokeAll = () => {
        let allowancesToRevoke: allowancesToRevoke = []
        if (groupBy === AllowancesFilters.SPENDER) {
            allowances.forEach((spenderAllowances) => {
                const spenderAddress = spenderAllowances.groupBy.address
                spenderAllowances.allowances.forEach((allowance) => {
                    allowancesToRevoke.push({
                        assetAddress: allowance.displayData.address,
                        spenderAddress: spenderAddress,
                    })
                })
            })
        } else {
            allowances.forEach((tokenAllowances) => {
                const assetAddress = tokenAllowances.groupBy.address
                tokenAllowances.allowances.forEach((allowance) => {
                    allowancesToRevoke.push({
                        assetAddress: assetAddress,
                        spenderAddress: allowance.displayData.address,
                    })
                })
            })
        }
        history.push({
            pathname: "/transaction/approve",
            state: {
                assetAddress: allowancesToRevoke[0].assetAddress,
                approveOperation: ApproveOperation.REVOKE,
                spenderAddress: allowancesToRevoke[0].spenderAddress,
                nextLocationState: {
                    fromAssetDetails: false,
                    groupBy: groupBy,
                    toRevoke: allowancesToRevoke.slice(1),
                } as AllowancePageLocalState,
            },
        })
    }

    useEffect(() => {
        const allowancesToRevoke = history.location.state?.toRevoke
        if (allowancesToRevoke && allowancesToRevoke.length > 0) {
            setTimeout(() => {
                history.push({
                    pathname: "/transaction/approve",
                    state: {
                        assetAddress: allowancesToRevoke[0].assetAddress,
                        approveOperation: ApproveOperation.REVOKE,
                        spenderAddress: allowancesToRevoke[0].spenderAddress,
                        nextLocationState: {
                            fromAssetDetails: false,
                            groupBy: groupBy,
                            toRevoke: allowancesToRevoke.slice(1),
                        } as AllowancePageLocalState,
                    },
                })
            }, 500)
        }
    }, [history.location.state?.toRevoke])

    const refetchAllowances = () => {
        refreshTokenAllowances()
    }

    const onFilterChange = (filter: AllowancesFilters) => {
        setGroupBy(filter)
        setSearch("")
        if (searchInputRef.current) {
            searchInputRef.current.value = ""
        }
    }

    useEffect(() => {
        console.log("allowances", allowances)
        setShowEmptyState(allowances.length === 0)
    }, [allowances])

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Allowances"
                    tooltip={{
                        link: "https://academy.bit2me.com/en/que-es-token-allowance/#:~:text=This%20standard%20defined%20the%20basic,contained%20in%20a%20given%20address.",
                        content: (
                            <div className="font-normal text-xs text-white-500">
                                Token allowance is a function that grants
                                permissions <br /> to access and use funds by
                                DApps. <br />
                                Click on this icon to learn more.
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
                message={`You will revoke all the currently visible allowances (${allowances.length}). You will need to confirm each action in sequence.`}
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
                onConfirm={() => {
                    setConfirmRefresh(false)
                    refetchAllowances()
                }}
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
