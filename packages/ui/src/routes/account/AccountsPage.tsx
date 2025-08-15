import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import AccountSelect from "../../components/account/AccountSelect"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { selectAccount } from "../../context/commActions"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSortedAccounts } from "../../context/hooks/useSortedAccounts"

// Icons
import { HiUser, HiInformationCircle } from "react-icons/hi"

const AccountsPage = () => {
    const selectedAccount = useSelectedAccount()
    const history = useOnMountHistory()
    const accounts = useSortedAccounts({ includeHiddenAccounts: true })

    const activeAccountsCount = accounts.filter(account =>
        account.status !== "HIDDEN"
    ).length

    const hiddenAccountsCount = accounts.filter(account =>
        account.status === "HIDDEN"
    ).length

    const setSelectedAccount = async (account: AccountInfo) => {
        await selectAccount(account.address)
        history.push("/")
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="My Accounts"
                    tooltip={{
                        link: "https://blockwallet.io/docs/accounts",
                        content: (
                            <div className="font-normal text-xs">
                                Manage your wallet accounts, create new ones, and switch between them.
                            </div>
                        ),
                    }}
                />
            }
        >
            <div className="flex flex-col h-full bg-white dark:bg-gray-900">
                {/* Compact Header Section */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center border border-blue-200 dark:border-blue-800">
                            <HiUser className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                Account Management
                            </h2>
                            <div className="flex items-center space-x-4 mt-1">
                                <div className="text-xs">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {activeAccountsCount}
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-400 ml-1">
                                        active
                                    </span>
                                </div>
                                {hiddenAccountsCount > 0 && (
                                    <div className="text-xs">
                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                            {hiddenAccountsCount}
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400 ml-1">
                                            hidden
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Selection Area - Main Content */}
                <div className="flex-1 overflow-auto min-h-0">
                    <AccountSelect
                        accounts={accounts}
                        selectedAccount={selectedAccount!}
                        showSelectedCheckmark={false}
                        onAccountChange={(account: AccountInfo) =>
                            setSelectedAccount(account)
                        }
                    />
                </div>

                {/* Compact Information Section */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-3">
                        <div className="flex items-start space-x-2">
                            <HiInformationCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                    Tips
                                </h3>
                                <p className="text-xs text-blue-800 dark:text-blue-200">
                                    Use different accounts for different purposes. Your current account determines which assets you see.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default AccountsPage
