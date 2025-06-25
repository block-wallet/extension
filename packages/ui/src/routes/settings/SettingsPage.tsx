import { useErrorHandler } from "react-error-boundary"

// Components
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import VerticalSelect from "../../components/input/VerticalSelect"

// Style
import { Classes } from "../../styles/classes"
import { classnames } from "../../styles/classes"

// Assets - keeping logoutIcon for potential future use in logout button
import logoutIcon from "../../assets/images/icons/logout.svg"

// Context
import { lockApp } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useBlankState } from "../../context/background/backgroundHooks"
import classNames from "classnames"
import GenericTooltip from "../../components/label/GenericTooltip"
import { openHardwareConnect } from "../../context/commActions"

import { useHotkeys } from "react-hotkeys-hook"
import { componentsHotkeys } from "../../util/hotkeys"

// Icons
import { HiCog, HiInformationCircle, HiLockClosed } from "react-icons/hi"
import { HiShieldCheck as HiShield } from "react-icons/hi"
import { BsGlobe, BsGear, BsInfo, BsChevronRight, BsPerson } from "react-icons/bs"
import { MdContactPage } from "react-icons/md"
import { RiHardDrive3Line } from "react-icons/ri"

const SettingsPage = () => {
    const { isSeedPhraseBackedUp, isImportingDeposits } = useBlankState()!
    const handleError = useErrorHandler()
    const history = useOnMountHistory()

    // Categorized options for better organization
    const walletManagementOptions = [
        {
            iconComponent: BsPerson,
            label: "Account",
            description: "Manage your accounts and balances",
            to: "/accounts/menu",
            category: "Wallet Management"
        },
        {
            iconComponent: RiHardDrive3Line,
            label: "Connect Hardware Wallet",
            description: "Connect Ledger, Trezor, or Keystone devices",
            onClick: () => openHardwareConnect(),
            category: "Hardware"
        },
    ]

    const networkAndDataOptions = [
        {
            iconComponent: BsGlobe,
            label: "Networks",
            description: "Manage blockchain networks and RPCs",
            to: "/settings/networks",
            category: "Network"
        },
        {
            iconComponent: MdContactPage,
            label: "Address Book",
            description: "Save and organize frequently used addresses",
            to: "/settings/addressBook",
            category: "Data"
        },
    ]

    const configurationOptions = [
        {
            iconComponent: BsGear,
            label: "Preferences",
            description: "Customize wallet behavior and appearance",
            to: "/settings/preferences",
            category: "Configuration"
        },
        {
            iconComponent: BsInfo,
            label: "About",
            description: "Version info, licenses, and support",
            to: "/settings/about",
            category: "Information"
        },
    ]

    const logout = () => {
        try {
            if (!isImportingDeposits) {
                lockApp()
            }
        } catch {
            handleError("Error logging out")
        }
    }

    const settingsPageHotkeys = componentsHotkeys.SettingsPage
    useHotkeys(settingsPageHotkeys, () => {
        openHardwareConnect()
    })

    // Common display function for consistent layout
    const renderOptionDisplay = (option: any, i: number) => (
        <div className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="flex-shrink-0 w-6 flex justify-center">
                <option.iconComponent className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="flex-1 ml-4 pr-4 min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {option.label}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                    {option.description}
                </div>
            </div>
            <div className="flex-shrink-0 w-6 flex justify-center">
                <BsChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </div>
        </div>
    )

    const handleOptionChange = (option: any) => {
        if (option.onClick) {
            option.onClick()
            return
        }
        option.to.includes("https://")
            ? chrome.tabs.create({ url: option.to })
            : history.push({
                pathname: option.to,
                state: {
                    from: "/settings",
                    ...(option.state ?? {}),
                },
            })
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Settings"
                    close="/"
                    onBack={() => history.push("/")}
                />
            }
        >
            <div className="flex flex-col space-y-6 p-6 bg-white dark:bg-gray-900 min-h-full">
                {/* Header Section */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700">
                            <HiCog className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Wallet Settings
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Configure your wallet preferences and manage your accounts
                        </p>
                    </div>
                </div>

                {/* Security Warning */}
                {!isSeedPhraseBackedUp && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                            <HiShield className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-1">
                                    Security Warning
                                </h3>
                                <p className="text-xs text-orange-800 dark:text-orange-200 mb-3">
                                    Back up your seed phrase to secure your funds and prevent loss of access to your wallet.
                                </p>
                                <button
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-orange-600 dark:bg-orange-500 text-white hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors"
                                    onClick={() => {
                                        history.push("/reminder")
                                    }}
                                >
                                    <HiShield className="w-3 h-3 mr-1" />
                                    Backup Now
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Wallet Management Section */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                            Wallet Management
                        </h3>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <VerticalSelect
                            options={walletManagementOptions}
                            value={undefined}
                            onChange={handleOptionChange}
                            containerClassName="divide-y divide-gray-200 dark:divide-gray-700"
                            display={renderOptionDisplay}
                            disableStyles={true}
                        />
                    </div>
                </div>

                {/* Network & Data Section */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                            Network & Data
                        </h3>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <VerticalSelect
                            options={networkAndDataOptions}
                            value={undefined}
                            onChange={handleOptionChange}
                            containerClassName="divide-y divide-gray-200 dark:divide-gray-700"
                            display={renderOptionDisplay}
                            disableStyles={true}
                        />
                    </div>
                </div>

                {/* Configuration Section */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                            Configuration
                        </h3>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <VerticalSelect
                            options={configurationOptions}
                            value={undefined}
                            onChange={handleOptionChange}
                            containerClassName="divide-y divide-gray-200 dark:divide-gray-700"
                            display={renderOptionDisplay}
                            disableStyles={true}
                        />
                    </div>
                </div>

                {/* Quick Tips Section */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                    <div className="flex items-start space-x-3">
                        <HiInformationCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                Quick Tips
                            </h3>
                            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                <li>• Use keyboard shortcuts to quickly access hardware wallet connections</li>
                                <li>• Regular backup of your seed phrase ensures wallet recovery</li>
                                <li>• Custom network settings allow connection to testnets and private chains</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Logout Section */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <GenericTooltip
                        top
                        divFull
                        disabled={!isImportingDeposits}
                        content={
                            <p className="w-full text-center text-gray-900 dark:text-gray-100">
                                Please wait until deposits are done loading
                                before locking the wallet. This can take up
                                to 15 minutes
                            </p>
                        }
                    >
                        <button
                            type="button"
                            onClick={logout}
                            className={classnames(
                                "w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200",
                                !isImportingDeposits
                                    ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 cursor-not-allowed"
                            )}
                            disabled={isImportingDeposits}
                        >
                            <HiLockClosed className={classnames(
                                "w-4 h-4",
                                isImportingDeposits && "opacity-30"
                            )} />
                            <span>Lock Wallet</span>
                        </button>
                    </GenericTooltip>

                    {/* Logout Help Text */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                        Locking your wallet will require your password to access it again
                    </p>
                </div>
            </div>
        </PopupLayout>
    )
}

export default SettingsPage
