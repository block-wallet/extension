import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useSelectedAddressWithChainIdChecksum } from "../../util/hooks/useSelectedAddressWithChainIdChecksum"
import VerticalSelect from "../input/VerticalSelect"
import PopupHeader from "../popup/PopupHeader"
import PopupLayout from "../popup/PopupLayout"
import AccountDisplay from "./AccountDisplay"

import exportIcon from "../../assets/images/icons/export.svg"
import trashBinIcon from "../../assets/images/icons/trash_bin.svg"
import openExternal from "../../assets/images/icons/open_external.svg"
import accountsIcon from "../../assets/images/icons/accounts.svg"
import resetIcon from "../../assets/images/icons/reset.svg"
import allowancesIcon from "../../assets/images/icons/allowances.svg"
import qrIcon from "../../assets/images/icons/qr_icon.svg"
import sites from "../../assets/images/icons/connected_sites.svg"
import EditIcon from "../icons/EditIcon"
import { generateExplorerLink, getExplorerTitle } from "../../util/getExplorer"
import { useBlankState } from "../../context/background/backgroundHooks"
import classnames from "classnames"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { HARDWARE_TYPES } from "../../util/account"
import { openHardwareRemove } from "../../context/commActions"

import { useHotkeys } from "react-hotkeys-hook"
import { componentsHotkeys } from "../../util/hotkeys"
import accounts_order from "../../assets/images/icons/accounts_order.svg"
import assets_order from "../../assets/images/icons/assets_order.svg"

import { HiQrcode as HiQrCode, HiGlobeAlt, HiDocumentDownload, HiExternalLink, HiShieldCheck, HiCog, HiUsers, HiSortAscending, HiRefresh, HiInformationCircle } from "react-icons/hi"
import { BsChevronRight } from "react-icons/bs"
import { RiDeleteBin7Line } from "react-icons/ri"
import { MdReorder } from "react-icons/md"

const AccountMenu = () => {
    const { availableNetworks, selectedNetwork, hotkeysEnabled } =
        useBlankState()!
    const account = useSelectedAccount()
    const checksumAddress = useSelectedAddressWithChainIdChecksum()
    const history = useOnMountHistory()
    const fromAccountList = history.location.state?.fromAccountList
    const explorerName = getExplorerTitle(availableNetworks, selectedNetwork)
    const exportAccountDataLabel = "Export Account Data"
    const removeHWLabel = "Remove Hardware Wallet"

    // Type definition for menu options
    type MenuOption = {
        iconComponent: React.ComponentType<any>
        label: string
        description: string
        to?: string
        category: string
        disabled?: boolean
        tooltip?: string
        warning?: boolean
        next?: () => void
    }

    const transactionOptions: MenuOption[] = [
        {
            iconComponent: HiQrCode,
            label: "Receive Funds",
            description: "Show QR code and address for receiving payments",
            to: "/accounts/menu/receive",
            category: "Transactions"
        },
        {
            iconComponent: HiGlobeAlt,
            label: "Connected Sites",
            description: "Manage dApp connections and permissions",
            to: "/accounts/menu/connectedSites",
            category: "Transactions"
        },
    ]

    const securityOptions: MenuOption[] = [
        {
            iconComponent: HiDocumentDownload,
            label: exportAccountDataLabel,
            description: "Export private key or JSON keystore file",
            to: "/accounts/menu/export",
            category: "Security",
            disabled: HARDWARE_TYPES.includes(account.accountType),
            tooltip: HARDWARE_TYPES.includes(account.accountType)
                ? "Not available for Hardware Wallets accounts."
                : undefined
        },
        {
            iconComponent: HiExternalLink,
            label: `View on ${explorerName}`,
            description: "Open account in blockchain explorer",
            to: generateExplorerLink(
                availableNetworks,
                selectedNetwork,
                checksumAddress,
                "address"
            ),
            category: "Security"
        },
    ]

    const managementOptions: MenuOption[] = [
        {
            iconComponent: HiShieldCheck,
            label: "Token Allowances",
            description: "Review and manage token spending permissions",
            to: "/accounts/menu/allowances",
            category: "Management"
        },
        {
            iconComponent: HiUsers,
            label: "My Accounts",
            description: "Switch between accounts and manage balances",
            to: "/accounts",
            category: "Management"
        },
        {
            iconComponent: HiSortAscending,
            label: "Assets Order",
            description: "Customize the order of tokens in your portfolio",
            to: "/accounts/menu/tokensOrder",
            category: "Management"
        },
        {
            iconComponent: MdReorder,
            label: "Accounts Order",
            description: "Reorder your accounts for better organization",
            to: "/accounts/menu/order",
            category: "Management"
        },
    ]

    const advancedOptions: MenuOption[] = [
        {
            iconComponent: HiRefresh,
            label: "Reset Account",
            description: "Clear account data and reimport from seed phrase",
            to: "/accounts/menu/reset",
            category: "Advanced",
            warning: true
        },
    ]

    if (HARDWARE_TYPES.includes(account.accountType)) {
        advancedOptions.push({
            iconComponent: RiDeleteBin7Line,
            label: removeHWLabel,
            description: "Disconnect and remove this hardware wallet",
            category: "Advanced",
            warning: true,
            next: () => {
                openHardwareRemove()
            },
        })
    }

    const accountMenuHotkeys = componentsHotkeys.AccountMenu
    useHotkeys(accountMenuHotkeys, () => {
        if (!hotkeysEnabled) return
        chrome.tabs.create({
            url: generateExplorerLink(
                availableNetworks,
                selectedNetwork,
                account.address,
                "address"
            ),
        })
    })

    const renderOptionDisplay = (option: MenuOption, i: number) => (
        <div className={classnames(
            "flex items-center p-4 transition-colors",
            option.disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer",
            option.warning && !option.disabled && "hover:bg-red-50 dark:hover:bg-red-900/20"
        )}>
            <div className="flex-shrink-0 w-6 flex justify-center">
                <option.iconComponent className={classnames(
                    "w-5 h-5",
                    option.disabled
                        ? "text-gray-400 dark:text-gray-500"
                        : option.warning
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-600 dark:text-gray-400"
                )} />
            </div>
            <div className="flex-1 ml-4 pr-4 min-w-0">
                <div className={classnames(
                    "text-sm font-semibold text-left",
                    option.disabled
                        ? "text-gray-400 dark:text-gray-500"
                        : option.warning
                            ? "text-red-700 dark:text-red-300"
                            : "text-gray-900 dark:text-gray-100"
                )}>
                    {option.label}
                </div>
                <div className={classnames(
                    "text-xs text-left",
                    option.disabled
                        ? "text-gray-400 dark:text-gray-500"
                        : option.warning
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-600 dark:text-gray-400"
                )}>
                    {option.description}
                </div>
            </div>
            {!option.disabled && (
                <div className="flex-shrink-0 w-6 flex justify-center">
                    <BsChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
            )}
        </div>
    )

    const handleOptionChange = (option: MenuOption) => {
        if (option.disabled) return

        if (option.next) {
            option.next()
            return
        }
        if (option.to) {
            option.to.includes("https://")
                ? chrome.tabs.create({ url: option.to })
                : history.push({
                    pathname: option.to,
                    state: {
                        from: "/accounts/menu",
                        fromAccountList,
                    },
                })
        }
    }

    const renderSection = (title: string, options: MenuOption[], icon: React.ComponentType<any>) => {
        const IconComponent = icon
        return (
            <div className="space-y-4">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                        {title}
                    </h3>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <VerticalSelect
                        options={options}
                        value={undefined}
                        onChange={handleOptionChange}
                        containerClassName="divide-y divide-gray-200 dark:divide-gray-700"
                        display={renderOptionDisplay}
                        disableStyles={true}
                        isDisabled={(option) => option.disabled}
                        tooltipOptions={options.reduce((acc, option) => {
                            if (option.tooltip) {
                                acc[option.label] = option.tooltip
                            }
                            return acc
                        }, {} as { [key: string]: string })}
                    />
                </div>
            </div>
        )
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Account"
                    onBack={() => {
                        history.push({
                            pathname: history.location.state?.fromAccountList
                                ? "/accounts"
                                : "/settings",
                        })
                    }}
                    networkIndicator
                />
            }
        >
            <div className="flex flex-col space-y-6 p-6 pt-4 bg-white dark:bg-gray-900 min-h-full">
                <div className="space-y-4">
                    <AccountDisplay
                        account={account}
                        actionButtons={[
                            <div
                                key={`current-account-action-button-1`}
                                onClick={() => {
                                    history.push({
                                        pathname: "/accounts/menu/edit",
                                        state: {
                                            fromAccountList:
                                                history.location.state
                                                    ?.fromAccountList,
                                        },
                                    })
                                }}
                                className="cursor-pointer p-2 transition duration-300 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                                <HiCog className="w-4 h-4" />
                            </div>,
                        ]}
                    />
                </div>

                {renderSection("Transactions & Connections", transactionOptions, HiQrCode)}

                {renderSection("Security & Export", securityOptions, HiShieldCheck)}

                {renderSection("Account Management", managementOptions, HiUsers)}

                {renderSection("Advanced Options", advancedOptions, HiRefresh)}

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                    <div className="flex items-start space-x-3">
                        <HiInformationCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                Account Management Tips
                            </h3>
                            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                <li>• Use keyboard shortcuts for quick access to account features</li>
                                <li>• Regular backup of account data ensures security</li>
                                <li>• Review token allowances periodically for enhanced security</li>
                                <li>• Hardware wallets provide the highest level of security</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default AccountMenu
