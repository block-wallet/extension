import { useRef } from "react"
import { useBlankState } from "../../context/background/backgroundHooks"
import { AccountType } from "../../context/commTypes"
import { accountNameExists, getNextAccountName } from "../../util/account"

const useNewAccountHelper = () => {
    const { hiddenAccounts, accounts } = useBlankState()!
    const allAccounts = { ...accounts, ...(hiddenAccounts || {}) }
    const suggestedAccountName = useRef(
        getNextAccountName(
            allAccounts,
            Object.values(allAccounts).filter(
                (a) =>
                    a.accountType === AccountType.HD_ACCOUNT ||
                    a.accountType === AccountType.EXTERNAL
            ).length + 1
        )
    )

    return {
        suggestedAccountName: suggestedAccountName.current,
        checkAccountNameAvailablility: (
            accountName: string
        ): { isAvailable: boolean; error?: string } => {
            if (accountNameExists(accounts, accountName)) {
                return {
                    isAvailable: false,
                    error: "Account name is already in use, please use a different one.",
                }
            }
            if (accountNameExists(hiddenAccounts, accountName)) {
                return {
                    isAvailable: false,
                    error: "Account name is already in use in hidden accounts, please use a different one.",
                }
            }
            return {
                isAvailable: true,
            }
        },
    }
}

export default useNewAccountHelper
