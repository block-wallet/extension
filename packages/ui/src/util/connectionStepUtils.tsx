import { Devices } from "../context/commTypes"
export interface ConnectionSeptInfo {
    label: string | string[] | React.ReactElement[]
    info?: string
}
export type StepData = {
    [device in Devices]: ConnectionSeptInfo[]
}

export const DEVICE_RECONNECTION_WARNING_STEPS: StepData = {
    LEDGER: [
        { label: "Only a single Ledger is plugged in" },
        { label: "Your device is unlocked" },
        {
            label: "The Ethereum App is open",
            info: "Always use the Ledger Ethereum App in combination with BlockWallet",
        },
    ],
    TREZOR: [
        { label: "Only a single Trezor is plugged in" },
        { label: "You have followed the steps on Trezor Connect page" },
    ],
    // TODO (KEYSTONE): Complete this.
    KEYSTONE: [{ label: "some data" }],
}

export const DEVICE_CONNECTION_STEPS: StepData = {
    LEDGER: [
        { label: "Plug in a your Ledger device" },
        { label: "Enter Ledger pin to unlock" },
        {
            label: "Open the Ethereum App",
            info: "Always use the Ledger Ethereum App in combination with BlockWallet",
        },
        { label: 'Click "Continue" below and select your Ledger' },
    ],
    TREZOR: [
        { label: "Plug in a your Trezor device" },
        { label: 'Click "Continue" below' },
        { label: "Follow steps on Trezor Connect page" },
    ],
    // TODO (KEYSTONE): Complete this.
    KEYSTONE: [{ label: "some data" }],
}
