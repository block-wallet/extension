import { useState, useEffect } from "react"

// Components
import PopupLayout from "../../components/popup/PopupLayout"
import PopupHeader from "../../components/popup/PopupHeader"

// Context
import { useBlankState } from "../../context/background/backgroundHooks"
import { getUnspentDeposits } from "../../context/commActions"
import DepositDisplay from "../../components/privacy/DepositDisplay"
import { CurrencyAmountPair } from "@block-wallet/background/controllers/blank-deposit/types"
import MissingDepositOrWithdrawTip from "../../components/privacy/MissingDepositOrWithdrawTip"
import Divider from "../../components/Divider"

interface WithdrawAndDeposits {
    id: string
    time: number
    status: "PENDING" | "WITHDRAWN"
    pair: CurrencyAmountPair
}

// Component
const DepositAndWithdrawHistory = () => {
    const state = useBlankState()
    const [items, setItems] = useState<WithdrawAndDeposits[]>([])

    useEffect(() => {
        async function fetch() {
            const formattedWithdrawals: WithdrawAndDeposits[] =
                state!.previousWithdrawals
                    .map((withdrawal) => ({
                        time: withdrawal.time,
                        id: withdrawal.depositId,
                        pair: withdrawal.pair,
                        status: "WITHDRAWN",
                    }))
                    .sort(
                        (a: any, b: any) => b.time - a.time
                    ) as WithdrawAndDeposits[]

            const unspentDeposits = await getUnspentDeposits()

            const formattedDeposits: WithdrawAndDeposits[] = unspentDeposits
                .map((deposit) => {
                    return {
                        id: deposit.id,
                        pair: deposit.pair,
                        status: "PENDING",
                        time: deposit.timestamp,
                    } as WithdrawAndDeposits
                })
                .sort((a: any, b: any) => b.time - a.time)

            setItems(formattedDeposits.concat(formattedWithdrawals))
        }

        fetch()
    }, [state])

    // Render
    return (
        <PopupLayout
            header={<PopupHeader title="Deposits and Withdrawals" keepState />}
        >
            <div className="py-4 px-6 text-left">
                <MissingDepositOrWithdrawTip />
            </div>
            <Divider />

            <div className="flex flex-col w-full px-6 py-3">
                {Array.isArray(items) && items.length > 0 ? (
                    items.map((item: WithdrawAndDeposits) => {
                        return (
                            <DepositDisplay
                                currencyPair={item.pair}
                                id={item.id}
                                status={item.status}
                                time={item.time}
                                key={item.id}
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

export default DepositAndWithdrawHistory
