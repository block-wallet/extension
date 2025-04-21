import { useState } from "react"
import { useBlankState } from "../../context/background/backgroundHooks"
import { isAccountDeviceLinked } from "../../context/commActions"
import log from "loglevel"

const useCheckAccountDeviceLinked = () => {
    const [isDeviceUnlinked, setIsDeviceUnlinked] = useState<boolean>(false)
    const { selectedAddress } = useBlankState()!

    const check = async () => {
        try {
            log.debug(`Checking hardware device link for ${selectedAddress}`)

            // Only perform the hardware check if device isn't already known to be unlinked
            if (!isDeviceUnlinked) {
                const deviceLinked = await isAccountDeviceLinked(selectedAddress)
                log.debug(`Device linked check result for ${selectedAddress}: ${deviceLinked}`)

                if (!deviceLinked) {
                    log.warn(`Hardware device not linked for address ${selectedAddress}`)
                    setIsDeviceUnlinked(true)
                    return false
                }
            } else {
                log.debug(`Device already known to be unlinked for ${selectedAddress}, skipping check`)
                return false
            }
        } catch (e) {
            log.error(`Error checking device link status for ${selectedAddress}:`, e)
            return false
        }
        return true
    }

    return {
        isDeviceUnlinked,
        checkDeviceIsLinked: check,
        resetDeviceLinkStatus: () => setIsDeviceUnlinked(false),
        //Wraps a function and checks whether the device is linked or not.
        //If the device is linked, executes the wrapped function. If not, then the function ins not executed.
        checkDeviceIsLinkedWrapper: (
            wrappedFn: (...args: any) => any
        ) => async (...args: any) => {
            const ok = await check()
            if (ok) {
                return wrappedFn(...args)
            }
            return false
        },
    }
}

export default useCheckAccountDeviceLinked
