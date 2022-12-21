import { useErrorHandler } from "react-error-boundary"

// Components
import PopupHeader from "../../components/popup/PopupHeader"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupLayout from "../../components/popup/PopupLayout"
import VerticalSelect from "../../components/input/VerticalSelect"

// Style
import { Classes } from "../../styles/classes"
import { classnames } from "../../styles/classes"

// Assets
import book from "../../assets/images/icons/book.svg"
import spanner from "../../assets/images/icons/spanner.svg"

import logoutIcon from "../../assets/images/icons/logout.svg"
import account from "../../assets/images/icons/account.svg"
import about from "../../assets/images/icons/about.svg"
import networkCloud from "../../assets/images/icons/network_cloud.svg"
import usb from "../../assets/images/icons/usb.svg"

// Context
import { lockApp } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useBlankState } from "../../context/background/backgroundHooks"
import classNames from "classnames"
import GenericTooltip from "../../components/label/GenericTooltip"
import AppVersion from "../../components/AppVersion"
import { openHardwareConnect } from "../../context/commActions"

const SettingsPage = () => {
    const { isSeedPhraseBackedUp, isImportingDeposits } = useBlankState()!
    const handleError = useErrorHandler()
    const history = useOnMountHistory()

    const options = [
        {
            icon: account,
            label: "Account",
            to: "/accounts/menu",
        },
        {
            icon: networkCloud,
            label: "Networks",
            to: "/settings/networks",
        },
        {
            icon: book,
            label: "Address Book",
            to: "/settings/addressBook",
        },
        {
            icon: spanner,
            label: "Preferences",
            to: "/settings/preferences",
        },
        {
            icon: usb,
            label: "Connect Hardware Wallet",
            onClick: () => openHardwareConnect(),
        },
        {
            icon: about,
            label: "About",
            to: "/settings/about",
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

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Settings"
                    close="/"
                    onBack={() => history.push("/")}
                />
            }
            footer={
                <PopupFooter>
                    <GenericTooltip
                        top
                        divFull
                        disabled={!isImportingDeposits}
                        content={
                            <p className="w-full text-center">
                                Please wait until deposits are done loading
                                before locking the wallet. This can take up to
                                15 minutes
                            </p>
                        }
                    >
                        <button
                            type="button"
                            onClick={logout}
                            className={classnames(
                                !isImportingDeposits
                                    ? Classes.logoutButton
                                    : Classes.disabledLogoutButton,
                                "w-full"
                            )}
                            disabled={isImportingDeposits}
                        >
                            <img
                                alt="Logout"
                                src={logoutIcon}
                                className={classnames(
                                    Classes.buttonIcon,
                                    isImportingDeposits && "opacity-30"
                                )}
                            />
                            Logout
                        </button>
                    </GenericTooltip>
                </PopupFooter>
            }
        >
            <div className="flex flex-col space-y-6 p-6">
                <div className="flex flex-col space-y-1">
                    <div className="flex flex-col space-y-4">
                        <VerticalSelect
                            options={options}
                            value={undefined}
                            onChange={(option) => {
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
                            }}
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
                                        <span className="font-bold">
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
                        {!isSeedPhraseBackedUp && (
                            <div className="w-full border border-gray-200 rounded-md flex justify-between items-center p-4">
                                <span className="text-xs mr-2">
                                    Back your seed phrase up and store it in a
                                    safe place.
                                </span>
                                <button
                                    className={classNames(Classes.smallButton)}
                                    onClick={() => {
                                        history.push("/reminder")
                                    }}
                                >
                                    Backup
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="mb-1 mx-auto mt-auto text-xxs ">
                <AppVersion />
            </div>
        </PopupLayout>
    )
}

export default SettingsPage
