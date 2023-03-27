import { AccountType, Devices } from "../context/commTypes"

const HW_DEVICE_ERRORS = [
    "DeviceNotReadyError",
    "DeviceNotPluggedError",
    "RejectedByUserError",
    "EthAppPleaseEnableContractData",
]

export const isHardwareDeviceError = (e?: Error) => {
    return e && HW_DEVICE_ERRORS.includes(e.name)
}

export const getDeviceFromAccountType = (
    accountType: AccountType
): Devices | undefined => {
    switch (accountType) {
        case AccountType.LEDGER:
            return Devices.LEDGER
        case AccountType.TREZOR:
            return Devices.TREZOR
        case AccountType.KEYSTONE:
            return Devices.KEYSTONE
    }
    return undefined
}

export const getAccountTypeFromDevice = (
    device: Devices
): AccountType.LEDGER | AccountType.TREZOR | AccountType.KEYSTONE => {
    switch (device) {
        case Devices.LEDGER:
            return AccountType.LEDGER
        case Devices.TREZOR:
            return AccountType.TREZOR
        case Devices.KEYSTONE:
            return AccountType.KEYSTONE
    }
}
