import { useState, useEffect } from "react"

// Components
import PopupLayout from "../../components/popup/PopupLayout"
import PopupHeader from "../../components/popup/PopupHeader"

// Context
import { useBlankState } from "../../context/background/backgroundHooks"
import DepositDisplay from "../../components/privacy/DepositDisplay"

// Component
const WithdrawHistory = () => {
    const state = useBlankState()

    const [withdrawals, setWithdrawals] = useState<any>(undefined)

    useEffect(() => {
        if (state) {
            setWithdrawals(
                state.previousWithdrawals.sort(
                    (a: any, b: any) => b.time - a.time
                )
            )
        }
    }, [state])

    // Render
    return (
        <PopupLayout header={<PopupHeader title="Withdrawals" keepState />}>
            {/* History */}
            <div className="flex flex-col w-full px-6 py-3">
                {Array.isArray(withdrawals) && withdrawals.length > 0 ? (
                    withdrawals.map((withdraw: any, i: number) => {
                        return (
                            <DepositDisplay
                                currencyPair={withdraw.pair}
                                id={withdraw.blankDepositId}
                                status="WITHDRAWN"
                                time={withdraw.time}
                                key={`withdrawal-${i}`}
                            />
                        )
                    })
                ) : (
                    <span className="text-sm text-gray-500">
                        No withdrawals made yet.
                    </span>
                )}
            </div>
        </PopupLayout>
    )
}

export default WithdrawHistory
