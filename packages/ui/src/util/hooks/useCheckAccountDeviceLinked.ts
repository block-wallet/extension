import { useState } from "react"
import { useBlankState } from "../../context/background/backgroundHooks"
import log from "loglevel"
import {
    isAccountDeviceLinked,
    postSlackMessage,
} from "../../context/commActions"
const useCheckAccountDeviceLinked = () => {
    const [isDeviceUnlinked, setIsDeviceUnlinked] = useState<boolean>(false)
    const { selectedAddress } = useBlankState()!
    const check = async () => {
        try {
            const deviceLinked = await isAccountDeviceLinked(selectedAddress)
            if (!deviceLinked) {
                setIsDeviceUnlinked(true)
                return false
            }
        } catch (e) {
            log.error(e)
            postSlackMessage(
                "Error checking if device is linked.",
                e,
                "File: useCheckAccountDeviceLinked"
            )
        }
        return true
    }

    return {
        isDeviceUnlinked,
        checkDeviceIsLinked: check,
        resetDeviceLinkStatus: () => setIsDeviceUnlinked(false),
        //Wraps a function and checks whether the device is linked or not.
        //If the device is linked, executes the wrapped function. If not, then the function ins not executed.
        checkDeviceIsLinkedWrapper:
            (wrappedFn: (...args: any) => any) =>
            async (...args: any) => {
                const ok = await check()
                if (ok) {
                    return wrappedFn(...args)
                }
                return false
            },
    }
}

export default useCheckAccountDeviceLinked
