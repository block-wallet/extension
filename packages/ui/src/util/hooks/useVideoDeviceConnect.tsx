import useAsyncInvoke from "./useAsyncInvoke"
import useClearStickyStorage from "../../context/hooks/useClearStickyStorage"
import { requestMediaAccess } from "../../context/util/requestMediaAccess"

const executeConnect = async (): Promise<boolean> => {
    const connectionOk = await requestMediaAccess()
    return Promise.resolve(connectionOk ?? false)
}

const useVideoDeviceConnect = (isReconnecting = false) => {
    const { run, isLoading, isError, isSuccess } = useAsyncInvoke()
    const { clear: clearStickyStorage } = useClearStickyStorage()

    return {
        connect: async () => {
            // Get rid of the sticky storage data
            // as the user should see the home page after the connection
            // when opening the extension again.
            if (!isReconnecting) {
                clearStickyStorage()
            }
            return run(executeConnect())
        },
        isLoading,
        isError,
        isSuccess,
    }
}

export default useVideoDeviceConnect
