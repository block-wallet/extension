import { useState } from "react"
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
    const [showEmptyState, setShowEmptyState] = useState(false)
    const [filter, setFilter] = useState<AllowancesFilters>(
        AllowancesFilters.SPENDER
    )
    const allowances = useAccountAllowances(filter)!

    const onSearchChange = (value: string) => {
        if (value.length > 0) {
            setShowEmptyState(true)
        } else {
            setShowEmptyState(false)
        }
    }

    const revokeAll = (allowances) => {
        console.log(allowances)
    }

    const refetchAllowances = () => {
        console.log("refetchAllowances")
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Allowances"
                    tooltipContent={
                        <div className="font-normal text-xs text-white-500">
                            Token Allowance is allowing a spender to spend{" "}
                            <br /> a token amount from your token balance.
                        </div>
                    }
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
                            placeholder="Search"
                            onChange={onSearchChange}
                            debounced
                        />
                    </div>
                    <AllowancesFilterButton
                        filter={filter}
                        onChangeFilter={setFilter}
                    />
                    <AllowancesRefetchButton onClick={refetchAllowances} />
                </div>
                {showEmptyState && (
                    <EmptyState title="No results" className="p-6">
                        The allowances you are searching for does not exist. Try
                        adjusting your search.
                    </EmptyState>
                )}
            </div>
            <div className="flex flex-col h-full w-full p-6">
                <div className="w-full mt-16 pt-2 h-full space-y-6">
                    <AllowanceList allowances={allowances} groupBy={filter} />
                </div>
            </div>
        </PopupLayout>
    )
}

export default AllowancesPage
