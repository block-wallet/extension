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
import editIcon from "../../assets/images/icons/pencil.svg"
import { generateExplorerLink, getExplorerTitle } from "../../util/getExplorer"
import { useBlankState } from "../../context/background/backgroundHooks"
import classnames from "classnames"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { HARDWARE_TYPES } from "../../util/account"
import { openHardwareRemove } from "../../context/commActions"
import { useHotkeys } from "react-hotkeys-hook"

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
    const options: {
        icon: string
        label: string
        to: string | undefined
        next?: () => void
    }[] = [
        {
            icon: qrIcon,
            label: "Receive Funds",
            to: "/accounts/menu/receive",
        },
        {
            icon: sites,
            label: "Connected Sites",
            to: "/accounts/menu/connectedSites",
        },
        {
            icon: exportIcon,
            label: exportAccountDataLabel,
            to: "/accounts/menu/export",
        },
        {
            icon: openExternal,
            label: "View on " + explorerName,
            to: generateExplorerLink(
                availableNetworks,
                selectedNetwork,
                checksumAddress,
                "address"
            ),
        },
    ]

    useHotkeys("alt+v", () => {
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

    const disabledOptions: { [k: string]: boolean } = {}
    const tooltipOptions: { [k: string]: string } = {}

    if (HARDWARE_TYPES.includes(account.accountType)) {
        disabledOptions[exportAccountDataLabel] = true
        tooltipOptions[exportAccountDataLabel] =
            "Not available for Hardware Wallets accounts."
        options.push({
            icon: trashBinIcon,
            label: removeHWLabel,
            to: undefined,
            next: () => {
                openHardwareRemove()
            },
        })
    }

    options.push({
        icon: allowancesIcon,
        label: "Token Allowances",
        to: "/accounts/menu/allowances",
    })

    options.push({
        icon: accountsIcon,
        label: "My Accounts",
        to: "/accounts",
    })

    options.push({
        icon: resetIcon,
        label: "Reset Account",
        to: "/accounts/menu/reset",
    })

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
                />
            }
        >
            <div className="flex flex-col p-6 space-y-4 text-sm text-gray-500">
                <div className="flex flex-col">
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
                                className="cursor-pointer p-2 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
                            >
                                <img src={editIcon} alt="Edit"></img>
                            </div>,
                        ]}
                    />
                </div>
                <div className="flex flex-col space-y-4">
                    <span className="text-xs">ACCOUNT SETTINGS</span>
                    <div className="flex flex-col space-y-1">
                        <VerticalSelect
                            options={options}
                            disabledOptions={disabledOptions}
                            tooltipOptions={tooltipOptions}
                            value={undefined}
                            onChange={(option) =>
                                option.to
                                    ? option.to.includes("https://")
                                        ? chrome.tabs.create({ url: option.to })
                                        : history.push({
                                              pathname: option.to,
                                              state: {
                                                  from: "/accounts/menu",
                                                  fromAccountList,
                                              },
                                          })
                                    : option.next()
                            }
                            containerClassName="flex flex-col space-y-4"
                            display={(option, i) => {
                                const className =
                                    "flex flex-row space-x-3 items-center text-gray-900 h-5"
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
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default AccountMenu
