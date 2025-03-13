import log from "loglevel"

const LEDGER_USB_VENDOR_ID = 0x2c97

/**
 * Checks if WebHID API is supported in the current browser
 * @returns boolean indicating if WebHID is supported
 */
export const isWebHIDSupported = (): boolean => {
    return !!(navigator && 'hid' in navigator)
}

/**
 * Checks if WebUSB API is supported in the current browser
 * @returns boolean indicating if WebUSB is supported
 */
export const isWebUSBSupported = (): boolean => {
    return !!(navigator && 'usb' in navigator)
}

/**
 * Attempts to connect to a LEDGER device using WebHID API
 * @returns boolean indicating if connection was successful
 */
export const connectWithWebHID = async (): Promise<boolean> => {
    try {
        const connectedDevices = await navigator.hid.requestDevice({
            filters: [{ vendorId: LEDGER_USB_VENDOR_ID }],
        })

        const approvedDevices = connectedDevices.some(
            (device) => device.vendorId === LEDGER_USB_VENDOR_ID
        )

        if (!approvedDevices) {
            log.error("LEDGER > No device selected with WebHID")
            return false
        }

        log.info("LEDGER > Successfully connected using WebHID")
        return true
    } catch (error) {
        log.error("LEDGER > WebHID connection error:", error)
        throw error
    }
}

/**
 * Attempts to connect to a LEDGER device using WebUSB API
 * @returns boolean indicating if connection was successful
 */
export const connectWithWebUSB = async (): Promise<boolean> => {
    try {
        // Safe access to navigator.usb - we already checked it exists in isWebUSBSupported()
        // @ts-ignore - TypeScript doesn't know about the WebUSB API
        const device = await navigator.usb.requestDevice({
            filters: [{ vendorId: LEDGER_USB_VENDOR_ID }]
        })

        if (!device || device.vendorId !== LEDGER_USB_VENDOR_ID) {
            log.error("LEDGER > No device selected with WebUSB")
            return false
        }

        log.info("LEDGER > Successfully connected using WebUSB")
        return true
    } catch (error) {
        log.error("LEDGER > WebUSB connection error:", error)
        throw error
    }
}

/**
 * User gesture to request access to connected LEDGER devices
 * using WebHID with fallback to WebUSB if WebHID is not supported
 * @returns boolean if user granted permissions to a device
 */
export const requestConnectDevice = async (): Promise<boolean> => {
    // First try WebHID if supported
    if (isWebHIDSupported()) {
        try {
            return await connectWithWebHID()
        } catch (error) {
            log.warn("LEDGER > WebHID connection failed, trying WebUSB...", error)
            // Continue to WebUSB as fallback
        }
    } else {
        log.info("LEDGER > WebHID not supported, trying WebUSB...")
    }

    // Try WebUSB as fallback or primary method if WebHID is not available
    if (isWebUSBSupported()) {
        try {
            return await connectWithWebUSB()
        } catch (error) {
            log.error("LEDGER > WebUSB connection error:", error)
            if (error instanceof DOMException && error.name === "NotFoundError") {
                log.error("LEDGER > No device selected")
                return false
            } else if (error instanceof DOMException && error.name === "SecurityError") {
                log.error("LEDGER > Security error: Permission denied")
                return false
            }
            throw error
        }
    } else {
        // Neither WebHID nor WebUSB is supported
        log.error("LEDGER > Browser does not support WebHID or WebUSB")
        return false
    }
}
