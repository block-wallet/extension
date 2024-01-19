import log from "loglevel"
import { postSlackMessage } from "../commActions"

const LEDGER_USB_VENDOR_ID = 0x2c97

/**
 * User gesture to request access to connected devices filtered by vendor
 * @returns boolean if user granted permissions to a device
 */
export const requestConnectDevice = async () => {
    try {
        //LEDGER vendorId 0x2c97
        const connectedDevices = await navigator.hid.requestDevice({
            filters: [{ vendorId: LEDGER_USB_VENDOR_ID }],
        })

        const approvedDevices = connectedDevices.some(
            (device) => device.vendorId === LEDGER_USB_VENDOR_ID
        )

        if (!approvedDevices) {
            log.error("LEDGER > No device selected")
            return false
        }

        return true
    } catch (error) {
        log.error("error ", error)
        postSlackMessage(
            "Error connectiong device",
            error,
            "File: requestConnectDevice."
        )
    }
}
