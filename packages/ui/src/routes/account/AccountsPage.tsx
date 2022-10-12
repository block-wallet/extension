import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import AccountSelect from "../../components/account/AccountSelect"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { selectAccount } from "../../context/commActions"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSortedAccounts } from "../../context/hooks/useSortedAccounts"

const AccountsPage = () => {
    const selectedAccount = useSelectedAccount()
    const history = useOnMountHistory()
    const accounts = useSortedAccounts({ includeHiddenAccounts: true })
    const setSelectedAccount = async (account: AccountInfo) => {
        await selectAccount(account.address)
        history.push("/")
    }

    return (
        <PopupLayout header={<PopupHeader title="My Accounts" />}>
            <AccountSelect
                accounts={accounts}
                selectedAccount={selectedAccount!}
                showSelectedCheckmark={false}
                onAccountChange={(account: AccountInfo) =>
                    setSelectedAccount(account)
                }
            />
        </PopupLayout>
    )
}

export default AccountsPage
