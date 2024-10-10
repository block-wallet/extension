/**
 * Hardware Wallet Devices Vendors
 */
export enum Devices {
    LEDGER = 'LEDGER',
    TREZOR = 'TREZOR',
    KEYSTONE = 'KEYSTONE',
}

type HDPath = {
    name: string;
    path: string;
    default?: boolean;
};
type DevicesHDPath = {
    [device in Devices]: HDPath[];
};

export const BIP44_PATH = `m/44'/60'/0'/0`;
export const HDPaths: DevicesHDPath = {
    LEDGER: [
        { name: 'BIP44 Standard', path: BIP44_PATH },
        { name: 'Legacy (MEW / MyCrypto)', path: `m/44'/60'/0'` },
        { name: 'Ledger Live', path: `m/44'/60'/0'/0/0`, default: true },
    ],
    TREZOR: [
        { name: 'BIP44 Standard', path: BIP44_PATH, default: true },
        /*{ name: 'Trezor Testnets', path: `m/44'/1'/0'/0` },*/
    ],
    KEYSTONE: [
        { name: 'BIP44 Standard', path: BIP44_PATH },
        { name: 'Ledger Legacy', path: `m/44'/60'/0'` },
        { name: 'Ledger Live', path: `m/44'/60'/0'/0/0`, default: true },
    ],
};
