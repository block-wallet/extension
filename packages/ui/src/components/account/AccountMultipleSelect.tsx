import { FunctionComponent } from "react"
import AccountDisplay from "../account/AccountDisplay"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { Classes, classnames } from "../../styles"

const AccountMultipleSelect: FunctionComponent<{
    accounts: AccountInfo[]
    selectedAccount?: AccountInfo
    showAddress?: boolean
    value: AccountInfo[]
    onChange: (value: AccountInfo[]) => void
}> = ({ accounts, selectedAccount, showAddress = false, value, onChange }) => {
    const toggleAccount = (account: AccountInfo) => {
        const newValue = value.some((a) => a.address === account.address)
            ? value.filter((a) => a.address !== account.address)
            : [...value, account]
        onChange(newValue)
    }
    return (
        <div className="flex flex-col space-y-3 text-sm text-gray-500">
            {accounts.map((account, i) => (
                <div
                    className="flex flex-row items-center space-x-3 cursor-pointer rounded-md hover:bg-primary-100 pl-2"
                    key={i}
                    onClick={() => toggleAccount(account)}
                >
                    <input
                        type="checkbox"
                        className={classnames(Classes.checkboxAlt)}
                        checked={value.some(
                            (a) => a.address === account.address
                        )}
                        onChange={() => toggleAccount(account)}
                        id={`check-account-${account.address}`}
                        aria-label={account.name}
                    />
                    <AccountDisplay
                        account={account}
                        showAddress={showAddress}
                    />
                </div>
            ))}
        </div>
    )
}

export default AccountMultipleSelect
