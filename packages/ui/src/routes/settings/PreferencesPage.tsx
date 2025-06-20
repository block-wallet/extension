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
import VerticalSelect from "../../components/input/VerticalSelect"

const PreferencesPage = () => {
    const history = useHistory()

    // Using a data URL for theme icon (sun/moon icon)
    const themeIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'/%3E%3C/svg%3E"

    const options = [
        {
            icon: lock,
            label: "Lock Timeout",
            to: "/settings/preferences/lockTimeout",
        },
        {
            icon: pin,
            label: "Locale Configuration",
            to: "/settings/preferences/locale",
        },
        {
            icon: news,
            label: "Release Notes",
            to: "/settings/preferences/releaseNotes",
        },
        {
            icon: world,
            label: "Default Browser Wallet",
            to: "/settings/preferences/defaultWallet",
        },
        {
            icon: gas,
            label: "Default Gas Setting",
            to: "/settings/preferences/defaultGas",
        },
        {
            icon: themeIcon,
            label: "Theme",
            to: "/settings/preferences/theme",
        },
        {
            icon: bell,
            label: "Notifications & Warnings",
            to: "/settings/preferences/notificationsAndWarnings",
        },
        {
            icon: shield,
            label: "Phishing Protection",
            to: "/settings/preferences/phishing",
        },
        {
            icon: hotkeys,
            label: "Keyboard Shortcuts",
            to: "/settings/preferences/hotkeys",
        },
    ]

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
            <div className="flex flex-col space-y-6 p-6">
                <div className="flex flex-col space-y-1">
                    <div className="flex flex-col space-y-4">
                        <VerticalSelect
                            options={options}
                            value={undefined}
                            onChange={(option) =>
                                history.push({
                                    pathname: option.to,
                                    state: {
                                        from: "/settings",
                                        ...(option.state ?? {}),
                                    },
                                })
                            }
                            containerClassName="flex flex-col space-y-4"
                            display={(option, i) => {
                                const className =
                                    "flex flex-row space-x-3 items-center text-gray-900"
                                const children = (
                                    <>
                                        <div
                                            className={classnames(
                                                option.classes ?? ""
                                            )}
                                        >
                                            <img
                                                src={option.icon}
                                                alt="icon"
                                                className={
                                                    option.size ?? "w-5 h-5"
                                                }
                                            />
                                        </div>
                                        <span className="font-semibold">
                                            {option.label}
                                        </span>
                                    </>
                                )
                                return (
                                    <div className={classnames(className)}>
                                        {children}
                                    </div>
                                )
                            }}
                        />
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default PreferencesPage
