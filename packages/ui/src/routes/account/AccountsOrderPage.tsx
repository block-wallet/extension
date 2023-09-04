import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { useCallback, useEffect, useState } from "react"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useSortedAccounts } from "../../context/hooks/useSortedAccounts"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import AccountDisplayDragDrop from "../../components/account/AccountsDisplayDragDrop"
import { orderAccounts } from "../../context/commActions"
import PopupFooter from "../../components/popup/PopupFooter"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { useHistory } from "react-router-dom"
import SuccessDialog from "../../components/dialog/SuccessDialog"

const AccountsOrderPage = () => {
    const sortedAccounts = useSortedAccounts({ includeHiddenAccounts: true })
    const [accounts, setAccounts] = useState<AccountInfo[]>([])
    const [successOpen, setSuccessOpen] = useState(false)

    const history = useHistory()!

    const findAccountCard = useCallback(
        (address: string) => {
            const account = accounts.find((n) => n.address === address)!

            return {
                account,
                index: accounts.indexOf(account),
            }
        },
        [accounts]
    )

    const moveAccountCard = useCallback(
        (address: string, hoveredOnIndex: number) => {
            const { account, index: draggedIndex } = findAccountCard(address)

            const newAccounts = structuredClone(accounts)
            newAccounts.splice(draggedIndex, 1) // removing what is being dragged.
            newAccounts.splice(hoveredOnIndex, 0, account) // adding the dragged item to the new hovered on index.

            setAccounts(newAccounts)
        },
        [findAccountCard, accounts]
    )

    function onSuccessfulDrop() {
        let accountsOrder: AccountInfo[] = []
        accounts.forEach((account, order) => {
            accountsOrder.push({
                ...account,
                index: order + 1,
            })
        })

        orderAccounts(accountsOrder)
    }

    useEffect(() => {
        setAccounts(sortedAccounts)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <PopupLayout
            header={<PopupHeader title="Accounts order" />}
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Save"
                        onClick={() => setSuccessOpen(true)}
                    />
                </PopupFooter>
            }
        >
            <SuccessDialog
                open={successOpen}
                title={"Accounts order"}
                message={`Order of accounts was successfully saved.`}
                onDone={() => {
                    setSuccessOpen(false)
                    history.push("/accounts")
                }}
                timeout={1000}
            />
            <div className="flex flex-col p-4 space-y-6 w-full">
                <DndProvider backend={HTML5Backend}>
                    <div className="flex flex-col space-y-2">
                        <div className="flex flex-col space-y-2">
                            {accounts.map((account) => (
                                <AccountDisplayDragDrop
                                    account={account}
                                    hoverable={true}
                                    findAccountCard={findAccountCard}
                                    moveAccountCard={moveAccountCard}
                                    onSuccessfulDrop={onSuccessfulDrop}
                                    key={account.address}
                                    hiddenAccount
                                />
                            ))}
                        </div>
                    </div>
                </DndProvider>
            </div>
        </PopupLayout>
    )
}

export default AccountsOrderPage
