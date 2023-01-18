import { connectHardwareWallet } from "../../context/commActions"
import { Devices } from "../../context/commTypes"
import { requestConnectDevice } from "../../context/util/requestConnectDevice"
import useAsyncInvoke from "./useAsyncInvoke"
import log from "loglevel"
import useClearStickyStorage from "../../context/hooks/useClearStickyStorage"

const executeConnect = async (vendor: Devices): Promise<boolean> => {
    // If we add transport type selection, here we should validate if it's WebHID
    if (vendor === Devices.LEDGER) {
        const connectionOk = await requestConnectDevice()
        if (!connectionOk) {
            return Promise.resolve(false)
        }
    } else if (vendor == Devices.KEYSTONE) {
        // TODO (KEYSTONE): Here we should read the qr with the camera
    }
    try {
        return await connectHardwareWallet(vendor)
    } catch (e) {
        log.error(e)
    }
    return Promise.resolve(false)
}

const useHardwareWalletConnect = (isReconnecting = false) => {
    const { run, isLoading, isError, isSuccess } = useAsyncInvoke()
    const { clear: clearStickyStorage } = useClearStickyStorage()

    return {
        connect: async (vendor: Devices) => {
            // Get rid of the sticky storage data
            // as the user should see the home page after the connection
            // when opening the extension again.
            if (!isReconnecting) {
                clearStickyStorage()
            }
            return run(executeConnect(vendor))
        },
        isLoading,
        isError,
        isSuccess,
    }
}

export default useHardwareWalletConnect
