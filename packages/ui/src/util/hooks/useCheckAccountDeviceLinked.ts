import { useState } from "react"
import { useBlankState } from "../../context/background/backgroundHooks"
import { isAccountDeviceLinked } from "../../context/commActions"
import log from "loglevel"

const useCheckAccountDeviceLinked = (addressOverride?: string) => {
    const [isDeviceUnlinked, setIsDeviceUnlinked] = useState<boolean>(false)
    const { selectedAddress } = useBlankState()!
    const addressToCheck = (addressOverride || selectedAddress)

    const check = async () => {
        try {
            log.debug(`Checking hardware device link for ${addressToCheck}`)

            if (!isDeviceUnlinked) {
                const deviceLinked = await isAccountDeviceLinked(addressToCheck)
                log.debug(`Device linked check result for ${addressToCheck}: ${deviceLinked}`)

                if (!deviceLinked) {
                    log.warn(`Hardware device not linked for address ${addressToCheck}`)
                    setIsDeviceUnlinked(true)
                    return false
                }
            } else {
                log.debug(`Device already known to be unlinked for ${addressToCheck}, skipping check`)
                return false
            }
        } catch (e) {
            log.error(`Error checking device link status for ${addressToCheck}:`, e)
            return false
        }
        return true
    }

    return {
        isDeviceUnlinked,
        checkDeviceIsLinked: check,
        resetDeviceLinkStatus: () => setIsDeviceUnlinked(false),
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
