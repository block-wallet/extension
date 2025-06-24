import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import pin from "../../assets/images/icons/pin.svg"
import lock from "../../assets/images/icons/lock.svg"
import world from "../../assets/images/icons/world.svg"
import gas from "../../assets/images/icons/gas.svg"
import news from "../../assets/images/icons/news.svg"
import bell from "../../assets/images/icons/bell.svg"
import shield from "../../assets/images/icons/shield.svg"
import hotkeys from "../../assets/images/icons/hotkeys.svg"
import { useHistory } from "react-router-dom"
import classnames from "classnames"
import { BsGear, BsMoon, BsChevronRight } from "react-icons/bs"

const PreferencesPage = () => {
    const history = useHistory()

    // Organized preference sections
    const securityPreferences = [
        {
            icon: lock,
            label: "Lock Timeout",
            description: "Configure automatic wallet lock settings",
            to: "/settings/preferences/lockTimeout",
        },
        {
            icon: shield,
            label: "Phishing Protection",
            description: "Enable anti-phishing image verification",
            to: "/settings/preferences/phishing",
        },
        {
            icon: bell,
            label: "Notifications & Warnings",
            description: "Manage security alerts and warnings",
            to: "/settings/preferences/notificationsAndWarnings",
        },
    ]

    const interfacePreferences = [
        {
            icon: <BsMoon className="w-5 h-5" />,
            label: "Theme",
            description: "Choose light, dark, or system theme",
            to: "/settings/preferences/theme",
        },
        {
            icon: pin,
            label: "Locale Configuration",
            description: "Set display currency and region",
            to: "/settings/preferences/locale",
        },
        {
            icon: hotkeys,
            label: "Keyboard Shortcuts",
            description: "Enable and configure hotkeys",
            to: "/settings/preferences/hotkeys",
        },
    ]

    const walletPreferences = [
        {
            icon: world,
            label: "Default Browser Wallet",
            description: "Set as default wallet for DApps",
            to: "/settings/preferences/defaultWallet",
        },
        {
            icon: gas,
            label: "Default Gas Setting",
            description: "Choose default transaction fee level",
            to: "/settings/preferences/defaultGas",
        },
        {
            icon: news,
            label: "Release Notes",
            description: "Stay updated with new features",
            to: "/settings/preferences/releaseNotes",
        },
    ]

    const renderPreferenceItem = (option: any) => (
        <button
            key={option.label}
            onClick={() =>
                history.push({
                    pathname: option.to,
                    state: {
                        from: "/settings",
                    },
                })
            }
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 group"
        >
            <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                    {typeof option.icon === 'string' ? (
                        <img
                            src={option.icon}
                            alt="icon"
                            className="w-5 h-5 text-gray-600 dark:text-gray-400"
                        />
                    ) : (
                        <div className="text-gray-600 dark:text-gray-400">
                            {option.icon}
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-left">
                        {option.label}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 text-left">
                        {option.description}
                    </span>
                </div>
            </div>
            <BsChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
        </button>
    )

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Preferences"
                    close="/"
                    onBack={() => {
                        history.push("/settings")
                    }}
                />
            }
        >
            <div className="flex flex-col p-6 space-y-6">
                {/* Header Information */}
                <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-gray-700">
                    <div className="flex items-start space-x-3">
                        <BsGear className="text-blue-600 dark:text-blue-400 text-lg mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-base font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                Wallet Preferences
                            </h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Customize your BlockWallet experience with security settings,
                                interface preferences, and wallet behavior options.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Security Section */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Security & Privacy
                        </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Configure security features and privacy protection settings.
                    </p>
                    <div className="space-y-3">
                        {securityPreferences.map(renderPreferenceItem)}
                    </div>
                </div>

                {/* Interface Section */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Interface & Experience
                        </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Personalize the wallet interface and interaction methods.
                    </p>
                    <div className="space-y-3">
                        {interfacePreferences.map(renderPreferenceItem)}
                    </div>
                </div>

                {/* Wallet Behavior Section */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Wallet Behavior
                        </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Set default behaviors and manage wallet integrations.
                    </p>
                    <div className="space-y-3">
                        {walletPreferences.map(renderPreferenceItem)}
                    </div>
                </div>

                {/* Quick Tips Section */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            💡 Quick Tips
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                            <p>• <span className="font-medium">Security First:</span> Enable phishing protection and configure appropriate lock timeouts</p>
                            <p>• <span className="font-medium">Efficiency:</span> Use keyboard shortcuts for faster navigation and operations</p>
                            <p>• <span className="font-medium">Stay Updated:</span> Subscribe to release notes to learn about new features</p>
                            <p>• <span className="font-medium">Customization:</span> Adjust theme and locale settings for your preferred experience</p>
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default PreferencesPage
