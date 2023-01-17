import { useEffect, useState } from "react"
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

const AllowancesPage = () => {
    const [search, setSearch] = useState("")
    const [showEmptyState, setShowEmptyState] = useState(false)
    const [groupBy, setGroupBy] = useState<AllowancesFilters>(
        AllowancesFilters.SPENDER
    )

    const allowances = useAccountAllowances(groupBy, search)!

    const revokeAll = (allowances: any) => {
        console.log(allowances)
    }

    const refetchAllowances = () => {
        console.log("refetchAllowances")
    }

    useEffect(() => {
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
                                DApps. Your token <br /> allowances should be
                                reviewed periodically. <br />
                                Click on this icon to learn more.
                            </div>
                        ),
                    }}
                    networkIndicator
                    close
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading label="Revoke All" onClick={revokeAll} />
                </PopupFooter>
            }
        >
            <div className="w-76 w-full p-6 bg-white fixed z-0 flex flex-col">
                <div className="flex flex-row space-x-2">
                    <div className="flex-1">
                        <SearchInput
                            inputClassName="!h-12"
                            placeholder={`Search ${
                                groupBy === AllowancesFilters.SPENDER
                                    ? "spenders"
                                    : "tokens"
                            }`}
                            onChange={(event) => setSearch(event.target.value)}
                            debounced
                            defaultValue={search}
                        />
                    </div>
                    <AllowancesFilterButton
                        filter={groupBy}
                        onChangeFilter={setGroupBy}
                    />
                    <AllowancesRefetchButton onClick={refetchAllowances} />
                </div>
                {showEmptyState && (
                    <EmptyState title="No allowances" className="p-6 mt-16">
                        The allowances you are searching for does not exist. Try
                        adjusting your search.
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
