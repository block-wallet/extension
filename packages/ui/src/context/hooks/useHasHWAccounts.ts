import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { useMemo } from "react"
import { AccountType, Devices } from "../commTypes"
import { useSortedAccounts } from "./useSortedAccounts"

export const useHasHWAccounts = (
    { device }: { device?: Devices } = { device: undefined }
): boolean => {
    const accounts = useSortedAccounts({
        includeHiddenAccounts: true,
    })
    return useMemo(() => {
        const devices = device
            ? [
                  device === Devices.LEDGER
                      ? AccountType.LEDGER
                      : AccountType.TREZOR,
              ]
            : [AccountType.LEDGER, AccountType.TREZOR]
        return accounts.some((account: AccountInfo) =>
            devices.includes(account.accountType)
        )
    }, [accounts, device])
}
