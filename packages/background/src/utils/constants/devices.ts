import { Devices } from "../types/hardware";

// HD Path constants for hardware wallets
export const BIP44_PATH = "m/44'/60'/0'/0";
export const LEDGER_LIVE_PATH = "m/44'/60'/0'/0/0";
export const LEDGER_LEGACY_PATH = "m/44'/60'/0'/0";
export const TREZOR_LEGACY_PATH = "m/44'/60'/0'/0";
export const TREZOR_LIVE_PATH = "m/44'/60'/0'/0/0";

export interface HDPathDescription {
    path: string;
    name: string;
    default: boolean;
}

export const HDPaths: Record<Devices, HDPathDescription[]> = {
    [Devices.LEDGER]: [
        {
            path: LEDGER_LEGACY_PATH,
            name: "Ledger Legacy",
            default: false,
        },
        {
            path: LEDGER_LIVE_PATH,
            name: "Ledger Live",
            default: true, // Making this the default since most users are likely using Ledger Live
        },
        {
            path: "m/44'/60'/0'",
            name: "BIP44 ETH (Alternative)",
            default: false,
        },
    ],
    [Devices.TREZOR]: [
        {
            path: TREZOR_LEGACY_PATH,
            name: "Trezor Legacy",
            default: true,
        },
        {
            path: TREZOR_LIVE_PATH,
            name: "Trezor Live",
            default: false,
        },
    ],
    [Devices.KEYSTONE]: [
        {
            path: BIP44_PATH,
            name: "BIP44",
            default: true,
        },
    ],
}; 