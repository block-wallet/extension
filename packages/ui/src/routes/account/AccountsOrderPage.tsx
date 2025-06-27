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
import { HiUsers, HiInformationCircle, HiCog } from "react-icons/hi"
import { MdDragIndicator, MdReorder } from "react-icons/md"

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
            header={<PopupHeader title="Accounts Order" />}
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Save Order"
                        onClick={() => setSuccessOpen(true)}
                    />
                </PopupFooter>
            }
        >
            <SuccessDialog
                open={successOpen}
                title={"Accounts Order"}
                message={`Account order has been successfully saved.`}
                onDone={() => {
                    setSuccessOpen(false)
                    history.push("/accounts")
                }}
                timeout={1000}
            />
            <div className="flex flex-col h-full bg-white dark:bg-gray-900">
                {/* Compact Header Section */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center border border-green-200 dark:border-green-800">
                            <MdReorder className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                Customize Account Order
                            </h2>
                            <div className="flex items-center space-x-4 mt-1">
                                <div className="text-xs">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {accounts.length}
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-400 ml-1">
                                        account{accounts.length !== 1 ? 's' : ''} to order
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compact Drag Instructions */}
                <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-2">
                        <MdDragIndicator className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <div className="text-xs text-green-800 dark:text-green-200">
                            <span className="font-medium">Drag & Drop:</span> Use handles to reorder accounts
                        </div>
                    </div>
                </div>

                {/* Account List Area - Main Content */}
                <div className="flex-1 overflow-auto min-h-0 p-4">
                    {accounts.length > 0 ? (
                        <DndProvider backend={HTML5Backend}>
                            <div className="space-y-2">
                                {accounts.map((account, index) => (
                                    <div key={account.address} className="relative">
                                        {/* Position indicator */}
                                        <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                                            {index + 1}
                                        </div>
                                        <AccountDisplayDragDrop
                                            account={account}
                                            hoverable={true}
                                            findAccountCard={findAccountCard}
                                            moveAccountCard={moveAccountCard}
                                            onSuccessfulDrop={onSuccessfulDrop}
                                            hiddenAccount
                                        />
                                    </div>
                                ))}
                            </div>
                        </DndProvider>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                                <HiUsers className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
                                No Accounts to Order
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                                Create accounts to customize their display order.
                            </p>
                        </div>
                    )}
                </div>

                {/* Compact Information Section */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-3">
                        <div className="flex items-start space-x-2">
                            <HiInformationCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">
                                    Tips
                                </h3>
                                <p className="text-xs text-green-800 dark:text-green-200">
                                    Place frequently used accounts at the top for quick access.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default AccountsOrderPage
