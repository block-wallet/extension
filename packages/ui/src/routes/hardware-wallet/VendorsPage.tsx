import { useEffect, useState } from "react"
import classnames from "classnames"

import { useOnMountHistory } from "../../context/hooks/useOnMount"

import { AccountType, Devices } from "../../context/commTypes"
import Divider from "../../components/Divider"

// Assets & icons
import ledger from "../../assets/images/icons/ledger.svg"
import trezor from "../../assets/images/icons/trezor.svg"
import keystone from "../../assets/images/keystone.png"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { Classes } from "../../styles"

import HardwareWalletSetupLayout from "./SetupLayout"
import OpenExplorerIcon from "../../components/icons/OpenExplorerIcon"
import { Browsers, getBrowserInfo } from "../../util/window"
import Tooltip from "../../components/label/Tooltip"
import { useSortedAccounts } from "../../context/hooks/useSortedAccounts"

const browser = getBrowserInfo()

const HardwareWalletVendorsPage = () => {
    const history = useOnMountHistory()
    const accounts = useSortedAccounts({ includeHiddenAccounts: true })
    const [keystoneDeviceConnected, setKeystoneDeviceConnected] =
        useState(false)
    const [selectedVendor, setSelectedVendor] = useState<Devices>()
    const next = () => {
        if (!keystoneDeviceConnected || selectedVendor !== Devices.KEYSTONE) {
            history.push({
                pathname:
                    selectedVendor !== Devices.KEYSTONE
                        ? "/hardware-wallet/connect"
                        : "/hardware-wallet/keystone-connect",
                state: { vendor: selectedVendor },
            })
        } else {
            history.push({
                pathname: "/hardware-wallet/accounts",
                state: { vendor: selectedVendor, isKeystoneConnected: true },
            })
        }
    }

    useEffect(() => {
        if (selectedVendor === Devices.KEYSTONE) {
            setKeystoneDeviceConnected(
                accounts.filter((q) => q.accountType === AccountType.KEYSTONE)
                    .length > 0
            )
        }
    }, [selectedVendor, accounts])

    return (
        <HardwareWalletSetupLayout
            title="Connect Hardware Wallet"
            subtitle="Select a Hardware Wallet you'd like to use with BlockWallet."
        >
            <div className="flex flex-col">
                <div className="flex flex-row space-x-4 items-center justify-evenly p-8">
                    <div className="flex relative group w-1/3">
                        <button
                            type="button"
                            onClick={() =>
                                browser !== Browsers.FIREFOX &&
                                setSelectedVendor(Devices.LEDGER)
                            }
                            className={classnames(
                                "bg-white rounded-md p-4 w-full flex flex-col items-center justify-center space-y-3 cursor-pointer border hover:border-primary-blue-default",
                                selectedVendor === Devices.LEDGER
                                    ? "border-primary-blue-default"
                                    : "border-primary-100",
                                browser === Browsers.FIREFOX &&
                                    "disabled border-gray-400 cursor-not-allowed hover:border-gray-400 "
                            )}
                            style={{ height: "120px" }}
                        >
                            <img
                                src={ledger}
                                alt="Connect Ledger"
                                className="h-8"
                            />
                        </button>
                        {browser === Browsers.FIREFOX && (
                            <Tooltip
                                className="pointer-events-none absolute bottom-0 -mb-2 transform !translate-x-3 !translate-y-full p-2 rounded-md text-xs font-medium bg-primary-black-default text-white"
                                content={
                                    <>
                                        <span>
                                            Browser not compatible. Please try
                                            using a different one.
                                        </span>
                                    </>
                                }
                            />
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedVendor(Devices.TREZOR)}
                        className={classnames(
                            "bg-white rounded-md justify-center p-4 w-1/3 flex flex-col items-center group space-y-3 cursor-pointer border  hover:border-primary-blue-default",
                            selectedVendor === Devices.TREZOR
                                ? "border-primary-blue-default"
                                : "border-primary-100"
                        )}
                        style={{ height: "120px" }}
                    >
                        <img
                            src={trezor}
                            alt="Connect Trezor"
                            className="h-8"
                        />
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedVendor(Devices.KEYSTONE)}
                        className={classnames(
                            "bg-white rounded-md justify-center p-4 w-1/3 flex flex-col items-center group space-y-3 cursor-pointer border  hover:border-primary-300",
                            selectedVendor === Devices.KEYSTONE
                                ? "border-primary-300"
                                : "border-primary-100"
                        )}
                        style={{ height: "120px" }}
                    >
                        <img src={keystone} alt="Connect Keystone" />
                    </button>
                </div>
                <Divider />
                <div className="p-8 w-full flex space-x-5">
                    <ButtonWithLoading
                        label={"Continue"}
                        buttonClass={classnames(Classes.button, "h-14")}
                        onClick={next}
                        disabled={!selectedVendor}
                    />
                </div>
                <div className="w-full flex-row items-center block text-center">
                    <a
                        className="text-black hover:text-primary-300 cursor-pointer inline-block mb-4"
                        href="https://blockwallet.io/docs/how-do-hardware-wallets-work"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="How do Hardware Wallets work?"
                    >
                        <OpenExplorerIcon className="inline-block" />
                        <span className="ml-2 font-semibold">
                            How do Hardware Wallets work?
                        </span>
                    </a>
                </div>
            </div>
        </HardwareWalletSetupLayout>
    )
}

export default HardwareWalletVendorsPage
