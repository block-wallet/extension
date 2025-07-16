import { AriaAttributes } from "react"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { openHardwareConnect } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import Icon, { IconName } from "../../components/ui/Icon"
import classNames from "classnames"
import { PropsWithChildren } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { componentsHotkeys } from "../../util/hotkeys"

const CardFrame: React.FC<
    PropsWithChildren<{
        onClick: () => void
        role?: string
        disabled?: boolean
    }> &
    AriaAttributes
> = ({ children, onClick, role, disabled = false, ...ariaProps }) => {
    return (
        <div
            role={role}
            onClick={disabled ? undefined : onClick}
            {...ariaProps}
            className={classNames(
                "group relative rounded-xl border transition-all duration-200 ease-in-out cursor-pointer",
                "bg-white dark:bg-gray-800/50 backdrop-blur-sm",
                "border-gray-200 dark:border-gray-700/50",
                "hover:border-blue-300 dark:hover:border-blue-500/50",
                "hover:shadow-lg dark:hover:shadow-xl",
                "hover:bg-blue-50/50 dark:hover:bg-blue-900/10",
                "transform hover:scale-[1.02]",
                disabled && "opacity-50 pointer-events-none cursor-not-allowed"
            )}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 dark:from-blue-400/5 dark:to-purple-400/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <div className="relative p-5">
                {children}
            </div>
        </div>
    )
}

const CreateAccountCard: React.FC<{
    iconName: IconName
    title: string
    description: string
    onClick: () => void
    disabled?: boolean
    featured?: boolean
}> = ({ iconName, title, description, onClick, disabled = false, featured = false }) => {
    return (
        <CardFrame
            onClick={onClick}
            aria-label={title}
            role="button"
            disabled={disabled}
        >
            <div className="flex items-start space-x-4">
                {/* Icon with enhanced styling */}
                <div className={classNames(
                    "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200",
                    featured
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white shadow-lg"
                        : "bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                )}>
                    <Icon name={iconName} size="lg" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className={classNames(
                            "font-semibold transition-colors duration-200",
                            featured
                                ? "text-gray-900 dark:text-gray-100 text-base"
                                : "text-gray-800 dark:text-gray-200 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400"
                        )}>
                            {title}
                            {featured && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                                    Recommended
                                </span>
                            )}
                        </h3>
                        <Icon
                            name={IconName.RIGHT_CHEVRON}
                            size="sm"
                            className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-200"
                        />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200">
                        {description}
                    </p>
                </div>
            </div>
        </CardFrame>
    )
}

const CreateAccountPage = () => {
    const history = useOnMountHistory()

    const createAccountPageHotkeys = componentsHotkeys.CreateAccountPage
    useHotkeys(createAccountPageHotkeys, () => {
        openHardwareConnect()
    })

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Create New Account"
                    onBack={() => history.replace("/accounts")}
                />
            }
        >
            {/* Background with subtle gradient - ensure full coverage */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/10"></div>
            <div className="relative z-10 min-h-full">
                <div className="p-6 space-y-6">
                    {/* Header section with improved typography */}
                    <div className="text-center space-y-2 mb-8">
                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                            Choose how you'd like to add a new account to your wallet
                        </p>
                    </div>

                    {/* Account creation options with improved spacing */}
                    <div className="space-y-4">
                        <CreateAccountCard
                            title="New Account"
                            iconName={IconName.WALLET}
                            description="Create a new account derived from your existing seed phrase. Quick and secure."
                            onClick={() => history.push("/accounts/create/add")}
                            featured={true}
                        />
                        <CreateAccountCard
                            title="Import Account"
                            iconName={IconName.IMPORT}
                            description="Import an existing account using a private key from another wallet."
                            onClick={() => history.push("/accounts/create/import")}
                        />
                        <CreateAccountCard
                            title="Connect Hardware Wallet"
                            iconName={IconName.USB}
                            description="Connect and manage accounts from your hardware wallet device."
                            onClick={() => openHardwareConnect()}
                        />
                    </div>

                    {/* Help section */}
                    <div className="mt-8 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                    Need help choosing?
                                </h4>
                                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                    For most users, creating a "New Account" is the recommended option as it's derived from your existing secure seed phrase.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default CreateAccountPage
