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
        delete stateLogs.hiddenAccounts
        delete stateLogs.antiPhishingImage
        delete stateLogs.addressBook
        delete stateLogs.recentAddresses

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
