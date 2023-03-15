import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { useMemo } from "react"
import { HARDWARE_TYPES } from "../../util/account"
import { getAccountTypeFromDevice } from "../../util/hardwareDevice"
import { Devices } from "../commTypes"
import { useSortedAccounts } from "./useSortedAccounts"

export const useHasHWAccounts = (
    { device }: { device?: Devices } = { device: undefined }
): boolean => {
    const accounts = useSortedAccounts({
        includeHiddenAccounts: true,
    })
    return useMemo(() => {
        const devices = device
            ? [getAccountTypeFromDevice(device)]
            : HARDWARE_TYPES
        return accounts.some((account: AccountInfo) =>
            devices.includes(account.accountType)
        )
    }, [accounts, device])
}
