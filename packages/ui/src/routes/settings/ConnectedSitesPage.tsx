import { FunctionComponent, useMemo, useState } from "react"
import { SiteMetadata } from "@block-wallet/provider/types"
import ConfirmDialog from "../../components/dialog/ConfirmDialog"
import AppIcon from "../../components/icons/AppIcon"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useBlankState } from "../../context/background/backgroundHooks"
import { removeAccountFromSite } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { formatHashLastChars, formatName } from "../../util/formatAccount"

// Icons
import { HiGlobeAlt, HiTrash, HiInformationCircle, HiShieldCheck, HiExclamation, HiExternalLink, HiUsers } from "react-icons/hi"
import { BsShield, BsShieldCheck } from "react-icons/bs"

const ConnectedSite: FunctionComponent<{
    site: SiteMetadata
    origin: string
    onSiteClick: (origin: string) => void
    onDelete: (origin: string) => void
}> = ({ site, origin, onSiteClick, onDelete }) => {
    const [confirmOpen, setConfirmOpen] = useState(false)
    const hostname = new URL(origin).hostname

    return (
        <>
            <div className="group flex flex-row items-center justify-between w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                <div
                    className="flex flex-row items-center space-x-4 flex-1 cursor-pointer"
                    onClick={() => onSiteClick(origin)}
                >
                    <div className="flex flex-row items-center justify-center w-12 h-12 p-2 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 shadow-sm">
                        {site.iconURL ? (
                            <AppIcon iconURL={site.iconURL} size={12} />
                        ) : (
                            <HiGlobeAlt className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        )}
                    </div>
                    <div className="flex flex-col space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {hostname}
                            </span>
                            <BsShieldCheck className="w-4 h-4 text-green-500 dark:text-green-400" title="Connected" />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            Can view your account address
                        </div>
                    </div>
                    <HiExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <button
                    onClick={() => setConfirmOpen(true)}
                    className="ml-3 p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                    title="Disconnect site"
                >
                    <HiTrash className="w-5 h-5" />
                </button>
            </div>
            <ConfirmDialog
                title="Remove Site Connection"
                message={`Do you want to remove the connection to ${hostname}? This will revoke the site's access to your account information.`}
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={() => onDelete(origin)}
            />
        </>
    )
}

const ConnectedSitesPage = () => {
    const account = useSelectedAccount()
    const state = useBlankState()!
    const history = useOnMountHistory()
    const fromAccountList = history.location.state?.fromAccountList

    const connectedSites = useMemo(() => {
        const permissions = Object.values(state.permissions)
        const res = permissions.filter((p) =>
            p.accounts.includes(state.selectedAddress)
        )

        return res
    }, [state.permissions, state.selectedAddress])

    const handleSiteClick = (origin: string) => {
        history.push({
            pathname: "/accounts/menu/connectedSites/accountList",
            state: { origin, fromAccountList },
        })
    }

    const handleDeleteClick = async (origin: string) => {
        try {
            await removeAccountFromSite(origin, state.selectedAddress)
        } catch { }
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Connected Sites"
                    onBack={() => {
                        history.push({
                            pathname: "/accounts/menu",
                            state: { fromAccountList },
                        })
                    }}
                />
            }
        >
            <div className="flex flex-col space-y-6 p-6 bg-white dark:bg-gray-900 min-h-full">
                {/* Header Section */}
                <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center border border-blue-200 dark:border-blue-800">
                            <HiUsers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                Site Connections
                            </h2>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-semibold text-gray-900 dark:text-gray-100" title={account.name}>
                                    {formatName(account.name, 30)}
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100" title={account.address}>
                                    {" "}{formatHashLastChars(account.address)}
                                </span>
                                {connectedSites.length > 0
                                    ? " is connected to these sites. They can view your account address."
                                    : " is not connected to any sites."}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Connected Sites List */}
                {connectedSites.length > 0 ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                Connected Sites ({connectedSites.length})
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {connectedSites.map((permission, i) => (
                                <ConnectedSite
                                    key={i}
                                    site={permission.data}
                                    origin={permission.origin}
                                    onSiteClick={handleSiteClick}
                                    onDelete={handleDeleteClick}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700">
                            <BsShield className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                No Connected Sites
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
                                When you connect your wallet to dApps, they will appear here. You can manage permissions and disconnect sites as needed.
                            </p>
                        </div>
                    </div>
                )}

                {/* Security Information */}
                <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4">
                        <div className="flex items-start space-x-3">
                            <HiShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                                    What Connected Sites Can See
                                </h3>
                                <ul className="text-xs text-green-800 dark:text-green-200 space-y-1">
                                    <li>• Your wallet address and account balance</li>
                                    <li>• Request approval for transactions</li>
                                    <li>• View your transaction history for their site</li>
                                    <li>• Suggest network switches when needed</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
                        <div className="flex items-start space-x-3">
                            <HiExclamation className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                                    What They Cannot See
                                </h3>
                                <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                                    <li>• Your private keys or seed phrase</li>
                                    <li>• Transactions from other sites</li>
                                    <li>• Other accounts unless explicitly connected</li>
                                    <li>• Personal information beyond your wallet address</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                        <div className="flex items-start space-x-3">
                            <HiInformationCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                    Managing Connections
                                </h3>
                                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                    <li>• Click on a site to manage which accounts are connected</li>
                                    <li>• Use the trash icon to completely disconnect a site</li>
                                    <li>• Review connections regularly for security</li>
                                    <li>• Disconnect unused or suspicious sites immediately</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default ConnectedSitesPage
