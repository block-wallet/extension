import { ResponseGetState } from "@block-wallet/background/utils/types/communication"
import { useBlankState } from "../../context/background/backgroundHooks"

/**
 * A hook that returns a function that downloads the state logs (excluding sensitive data)
 *
 * @returns {downloadStateLogsHandler} - A function that downloads the state logs
 */
const useStateLogs = () => {
    const state = useBlankState()!
    const downloadStateLogsHandler = () => {
        let stateLogs: Partial<ResponseGetState> = state
        // Remove user sensitive data from state logs
        delete stateLogs.hiddenAccounts
        delete stateLogs.antiPhishingImage
        delete stateLogs.addressBook
        delete stateLogs.recentAddresses

        delete stateLogs.previousWithdrawals
        delete stateLogs.pendingDeposits
        delete stateLogs.depositsCount
        delete stateLogs.pendingWithdrawals
        delete stateLogs.areDepositsPending
        delete stateLogs.areWithdrawalsPending
        delete stateLogs.isVaultInitialized
        delete stateLogs.isImportingDeposits
        delete stateLogs.importingErrors

        const stateJsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(stateLogs)
        )}`

        const fileName = "StateLogs"

        const link = document.createElement("a")
        link.href = stateJsonString
        link.download = fileName + ".json"

        link.click()
    }

    return {
        downloadStateLogsHandler,
    }
}

export default useStateLogs
