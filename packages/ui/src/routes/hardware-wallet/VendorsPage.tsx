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
import { HiShieldCheck, HiExclamationCircle, HiInformationCircle } from "react-icons/hi"

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
            title="🔐 Connect Hardware Wallet"
            subtitle="Choose your hardware wallet to connect with BlockWallet. Hardware wallets provide the highest level of security for your digital assets."
        >
            <div className="flex flex-col bg-white dark:bg-gray-800">
                {/* Educational Information */}
                <div className="px-8 pt-4 pb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                        <div className="flex items-start space-x-3">
                            <HiInformationCircle className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" size={20} />
                            <div>
                                <h3 className="font-semibold text-blue-800 dark:text-blue-200 text-sm mb-2">
                                    Why Use a Hardware Wallet?
                                </h3>
                                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                    <li>• <strong>Maximum Security:</strong> Private keys never leave the device</li>
                                    <li>• <strong>Air-gapped:</strong> Isolated from internet-connected computers</li>
                                    <li>• <strong>Transaction Verification:</strong> Approve transactions on the device screen</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vendor Selection Cards */}
                <div className="flex flex-row space-x-4 items-center justify-evenly px-8 pb-6">
                    {/* Ledger Card */}
                    <div className="flex relative group w-1/3">
                        <button
                            type="button"
                            onClick={() =>
                                browser !== Browsers.FIREFOX &&
                                setSelectedVendor(Devices.LEDGER)
                            }
                            className={classnames(
                                "bg-white dark:bg-gray-700 rounded-lg p-4 w-full flex flex-col items-center justify-center space-y-3 cursor-pointer border-2 transition-all duration-200 hover:shadow-lg dark:hover:shadow-gray-900/50",
                                selectedVendor === Devices.LEDGER
                                    ? "border-primary-blue-default dark:border-primary-blue-400 shadow-md dark:shadow-gray-900/30 bg-blue-50 dark:bg-blue-900/20"
                                    : "border-gray-200 dark:border-gray-600 hover:border-primary-blue-default dark:hover:border-primary-blue-400",
                                browser === Browsers.FIREFOX &&
                                "disabled border-gray-400 dark:border-gray-500 cursor-not-allowed hover:border-gray-400 dark:hover:border-gray-500 opacity-60"
                            )}
                            style={{ height: "140px" }}
                        >
                            <img
                                src={ledger}
                                alt="Connect Ledger"
                                className="h-8 mb-2"
                            />
                            <div className="text-center">
                                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Ledger</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Nano S/X/S Plus</p>
                                {browser !== Browsers.FIREFOX && (
                                    <div className="flex items-center justify-center mt-2">
                                        <HiShieldCheck className="text-green-600 dark:text-green-400 mr-1" size={14} />
                                        <span className="text-xs text-green-600 dark:text-green-400">USB/Bluetooth</span>
                                    </div>
                                )}
                            </div>
                        </button>
                        {browser === Browsers.FIREFOX && (
                            <Tooltip
                                className="pointer-events-none absolute bottom-0 -mb-2 transform !translate-x-3 !translate-y-full p-2 rounded-md text-xs font-medium bg-red-600 dark:bg-red-700 text-white"
                                content={
                                    <div className="flex items-center space-x-2">
                                        <HiExclamationCircle size={16} />
                                        <span>
                                            Firefox not supported. Please use Chrome, Edge, or Brave.
                                        </span>
                                    </div>
                                }
                            />
                        )}
                    </div>

                    {/* Trezor Card */}
                    <button
                        type="button"
                        onClick={() => setSelectedVendor(Devices.TREZOR)}
                        className={classnames(
                            "bg-white dark:bg-gray-700 rounded-lg p-4 w-1/3 flex flex-col items-center justify-center space-y-3 cursor-pointer border-2 transition-all duration-200 hover:shadow-lg dark:hover:shadow-gray-900/50",
                            selectedVendor === Devices.TREZOR
                                ? "border-primary-blue-default dark:border-primary-blue-400 shadow-md dark:shadow-gray-900/30 bg-blue-50 dark:bg-blue-900/20"
                                : "border-gray-200 dark:border-gray-600 hover:border-primary-blue-default dark:hover:border-primary-blue-400"
                        )}
                        style={{ height: "140px" }}
                    >
                        <img
                            src={trezor}
                            alt="Connect Trezor"
                            className="h-8 mb-2"
                        />
                        <div className="text-center">
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Trezor</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Model One/T</p>
                            <div className="flex items-center justify-center mt-2">
                                <HiShieldCheck className="text-green-600 dark:text-green-400 mr-1" size={14} />
                                <span className="text-xs text-green-600 dark:text-green-400">USB</span>
                            </div>
                        </div>
                    </button>

                    {/* Keystone Card */}
                    <button
                        type="button"
                        onClick={() => setSelectedVendor(Devices.KEYSTONE)}
                        className={classnames(
                            "bg-white dark:bg-gray-700 rounded-lg p-4 w-1/3 flex flex-col items-center justify-center space-y-3 cursor-pointer border-2 transition-all duration-200 hover:shadow-lg dark:hover:shadow-gray-900/50",
                            selectedVendor === Devices.KEYSTONE
                                ? "border-green-500 dark:border-green-400 shadow-md dark:shadow-gray-900/30 bg-green-50 dark:bg-green-900/20"
                                : "border-gray-200 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400"
                        )}
                        style={{ height: "140px" }}
                    >
                        <img
                            src={keystone}
                            alt="Connect Keystone"
                            className="h-8 mb-2"
                        />
                        <div className="text-center">
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Keystone</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Air-gapped</p>
                            <div className="flex items-center justify-center mt-2">
                                <HiShieldCheck className="text-green-600 dark:text-green-400 mr-1" size={14} />
                                <span className="text-xs text-green-600 dark:text-green-400">QR Code</span>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Compatibility Information */}
                {selectedVendor && (
                    <div className="px-8 pb-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-2">
                                {selectedVendor} Connection Details:
                            </h4>
                            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                {selectedVendor === Devices.LEDGER && (
                                    <>
                                        <p>• Connects via USB or Bluetooth (Nano X)</p>
                                        <p>• Requires Ethereum app to be open on device</p>
                                        <p>• Best compatibility with Chrome, Edge, or Brave browsers</p>
                                    </>
                                )}
                                {selectedVendor === Devices.TREZOR && (
                                    <>
                                        <p>• Connects via USB cable</p>
                                        <p>• Works with all major browsers</p>
                                        <p>• Supports both Model One and Model T</p>
                                    </>
                                )}
                                {selectedVendor === Devices.KEYSTONE && (
                                    <>
                                        <p>• Air-gapped connection via QR codes</p>
                                        <p>• No USB or Bluetooth required</p>
                                        <p>• Maximum security through complete isolation</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <Divider />

                {/* Continue Button */}
                <div className="p-8 w-full flex space-x-5">
                    <ButtonWithLoading
                        label={selectedVendor ? `Continue with ${selectedVendor}` : "Select a Hardware Wallet"}
                        buttonClass={classnames(Classes.button, "h-14")}
                        onClick={next}
                        disabled={!selectedVendor}
                    />
                </div>

                {/* Learn More Link */}
                <div className="w-full flex-row items-center block text-center pb-6">
                    <a
                        className="text-gray-700 dark:text-gray-300 hover:text-primary-blue-default dark:hover:text-primary-blue-400 cursor-pointer inline-block transition-colors duration-200"
                        href="https://blockwallet.io/docs/how-do-hardware-wallets-work"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="How do Hardware Wallets work?"
                    >
                        <OpenExplorerIcon className="inline-block text-current" />
                        <span className="ml-2 font-semibold text-sm">
                            📚 How do Hardware Wallets work?
                        </span>
                    </a>
                </div>
            </div>
        </HardwareWalletSetupLayout>
    )
}

export default HardwareWalletVendorsPage
