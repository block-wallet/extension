import { updatePopupTab } from "../context/commActions"
import { useOnMountHistory } from "../context/hooks/useOnMount"

type Action = string | ((p?: any) => Promise<any>)

type HotkeyAction = {
    hotkey: string
    action: Action
    description: string
    hotkeyDescription: string
}

type HotkeyMap = {
    [path: string]: {
        CTRL: HotkeyAction[]
        ALT: HotkeyAction[]
        CTRLALT: HotkeyAction[]
    }
}

const locations: HotkeyMap = {
    "/home": {
        ALT: [
            {
                hotkey: "A",
                action: "/accounts",
                hotkeyDescription: "ALT+A",
                description: "Accounts",
            },
            {
                hotkey: "B",
                action: "/bridge",
                hotkeyDescription: "ALT+B",
                description: "Bridge",
            },
            {
                hotkey: "S",
                action: "/send",
                hotkeyDescription: "ALT+S",
                description: "Send",
            },
            {
                hotkey: "U",
                action: "/buy",
                hotkeyDescription: "ALT+U",
                description: "Buy",
            },
            {
                hotkey: "W",
                action: "/swap",
                hotkeyDescription: "ALT+W",
                description: "Swap",
            },
            {
                hotkey: "R",
                action: "/accounts/menu/receive",
                hotkeyDescription: "ALT+R",
                description: "Receive funds",
            },
            {
                hotkey: "1",
                action: () => updatePopupTab("activity"),
                hotkeyDescription: "ALT+1",
                description: "Switch to activity list",
            },
            {
                hotkey: "2",
                action: () => updatePopupTab("assets"),
                hotkeyDescription: "ALT+2",
                description: "Switch to assets list",
            },
            {
                //Leave empty to show it on Hotkeys popup, but it is executed from ActivityAssetsView
                hotkey: "N",
                action: "",
                hotkeyDescription: "",
                description: "Add token (on assets)",
            },
            {
                hotkey: "G",
                action: "",
                hotkeyDescription: "",
                description: "View gas prices",
            },
            {
                hotkey: "V",
                action: "",
                hotkeyDescription: "",
                description: "View on explorer",
            },
        ],
        CTRLALT: [
            {
                hotkey: "S",
                action: "/settings",
                hotkeyDescription: "CTRL+ALT+S",
                description: "Settings",
            },
            {
                hotkey: "R",
                action: "/accounts/menu/reset",
                hotkeyDescription: "CTRL+ALT+R",
                description: "Reset account",
            },
        ],
        CTRL: [],
    },
    "/settings": {
        ALT: [
            {
                hotkey: "1",
                action: "/accounts/menu",
                hotkeyDescription: "ALT+1",
                description: "Accounts",
            },
            {
                hotkey: "2",
                action: "/settings/networks",
                hotkeyDescription: "ALT+2",
                description: "Networks",
            },
            {
                hotkey: "3",
                action: "/settings/addressBook",
                hotkeyDescription: "ALT+3",
                description: "Address book",
            },
            {
                hotkey: "4",
                action: "/settings/preferences",
                hotkeyDescription: "ALT+4",
                description: "Preferences",
            },
            {
                hotkey: "5",
                action: "",
                hotkeyDescription: "",
                description: "Connect hardware wallet",
            },
            {
                hotkey: "6",
                action: "/settings/about",
                hotkeyDescription: "ALT+6",
                description: "About",
            },
        ],
        CTRL: [],
        CTRLALT: [],
    },
    "/accounts": {
        ALT: [
            {
                hotkey: "C",
                action: "/accounts/create",
                hotkeyDescription: "ALT+C",
                description: "New account",
            },
        ],
        CTRL: [],
        CTRLALT: [],
    },
    "/accounts/create": {
        ALT: [
            {
                hotkey: "C",
                action: "/accounts/create/add",
                hotkeyDescription: "ALT+C",
                description: "New account",
            },
            {
                hotkey: "I",
                action: "/accounts/create/import",
                hotkeyDescription: "ALT+I",
                description: "Import account",
            },
            {
                hotkey: "H",
                action: "",
                hotkeyDescription: "",
                description: "Connect hardware wallet",
            },
        ],
        CTRL: [],
        CTRLALT: [],
    },
    "/accounts/menu": {
        ALT: [
            {
                hotkey: "1",
                action: "/accounts/menu/receive",
                hotkeyDescription: "ALT+1",
                description: "Receive funds",
            },
            {
                hotkey: "2",
                action: "/accounts/menu/connectedsites",
                hotkeyDescription: "ALT+2",
                description: "Connected sites",
            },
            {
                hotkey: "3",
                action: "/accounts/menu/export",
                hotkeyDescription: "ALT+3",
                description: "Export",
            },
            {
                hotkey: "4",
                action: "",
                hotkeyDescription: "",
                description: "View on explorer",
            },
            {
                hotkey: "5",
                action: "/accounts/menu/allowances",
                hotkeyDescription: "ALT+5",
                description: "Token allowances",
            },
            {
                hotkey: "6",
                action: "/accounts",
                hotkeyDescription: "ALT+6",
                description: "My accounts",
            },
            {
                hotkey: "7",
                action: "/accounts/menu/tokensOrder",
                hotkeyDescription: "ALT+7",
                description: "Assets order",
            },
            {
                hotkey: "8",
                action: "/accounts/menu/order",
                hotkeyDescription: "ALT+8",
                description: "Accounts order",
            },
            {
                hotkey: "9",
                action: "/accounts/menu/reset",
                hotkeyDescription: "ALT+9",
                description: "Reset account",
            },
        ],
        CTRL: [],
        CTRLALT: [],
    },
    "/accounts/menu/allowances": {
        ALT: [
            {
                hotkey: "R",
                action: "",
                hotkeyDescription: "",
                description: "Refresh allowances",
            },
            {
                hotkey: "S",
                action: "",
                hotkeyDescription: "",
                description: "Group by spender",
            },
            {
                hotkey: "T",
                action: "",
                hotkeyDescription: "",
                description: "Group by token",
            },
        ],
        CTRL: [],
        CTRLALT: [],
    },
    "/settings/networks": {
        ALT: [
            {
                hotkey: "N",
                action: "/settings/networks/search",
                hotkeyDescription: "ALT+N",
                description: "Add network",
            },
        ],
        CTRL: [],
        CTRLALT: [],
    },
    "/settings/addressBook": {
        ALT: [
            {
                hotkey: "N",
                action: "/settings/addressBook/add",
                hotkeyDescription: "ALT+N",
                description: "New contact",
            },
        ],
        CTRL: [],
        CTRLALT: [],
    },
    "/settings/preferences": {
        ALT: [
            {
                hotkey: "1",
                action: "/settings/preferences/locktimeout",
                hotkeyDescription: "ALT+1",
                description: "Lock timeout",
            },
            {
                hotkey: "2",
                action: "/settings/preferences/locale",
                hotkeyDescription: "ALT+2",
                description: "Locale configuration",
            },
            {
                hotkey: "3",
                action: "/settings/preferences/releasenotes",
                hotkeyDescription: "ALT+3",
                description: "Release notes",
            },
            {
                hotkey: "4",
                action: "/settings/preferences/defaultwallet",
                hotkeyDescription: "ALT+4",
                description: "Default wallet",
            },
            {
                hotkey: "5",
                action: "/settings/preferences/defaultGas",
                hotkeyDescription: "ALT+5",
                description: "Default gas setting",
            },
            {
                hotkey: "6",
                action: "/settings/preferences/notificationsAndWarnings",
                hotkeyDescription: "ALT+6",
                description: "Notifications & warnings",
            },
            {
                hotkey: "7",
                action: "/settings/preferences/phishing",
                hotkeyDescription: "ALT+7",
                description: "Phishing protection",
            },
            {
                hotkey: "8",
                action: "/settings/preferences/hotkeys",
                hotkeyDescription: "ALT+8",
                description: "Keyboard shortcuts",
            },
        ],
        CTRL: [],
        CTRLALT: [],
    },
}

export const componentsHotkeys = {
    ActivityAssetsView: "ALT+N",
    GasPricesInfo: "ALT+G,ENTER",
    HotkeysCollapsedMessage: "ALT+K, ENTER",
    AllowancesPage: "ALT+R, ALT+S, ALT+T",
    AccountMenu: "ALT+4",
    PopupPage: "ALT+V",
    CreateAccountPage: "ALT+H",
    SettingsPage: "ALT+5",
}

export const getActionByHotkeyAndPath = (
    currentLocation: string,
    hotkey: string,
    handler: "CTRL" | "ALT" | "CTRLALT"
): Action => {
    return locations[currentLocation][handler].filter(
        (hotkeyAction) =>
            hotkeyAction.hotkey.toLowerCase() === hotkey.toLowerCase()
    )[0].action
}

export const getHotkeyByPath = (currentLocation: string) => {
    if (!locations[currentLocation]) {
        return ""
    }

    const ctrlHotkeysByPath = locations[currentLocation]["CTRL"]
        .map((hotkeyAction) => {
            return hotkeyAction.hotkeyDescription
        })
        .join(",")

    const altHotkeysByPath = locations[currentLocation]["ALT"]
        .map((hotkeyAction) => {
            return hotkeyAction.hotkeyDescription
        })
        .join(",")

    const ctrlAltHotkeysByPath = locations[currentLocation]["CTRLALT"]
        .map((hotkeyAction) => {
            return hotkeyAction.hotkeyDescription
        })
        .join(",")

    return (
        altHotkeysByPath + "," + ctrlHotkeysByPath + "," + ctrlAltHotkeysByPath
    )
}

//Return boolean indicating if current path has hotkeys (checks by permissions)
export const useCheckLocationHotkeys = (
    permissions?: { [action: string]: boolean },
    currentLocation?: string
): boolean => {
    const history = useOnMountHistory()
    currentLocation = currentLocation ?? history.location.pathname

    if (!locations[currentLocation]) {
        return false
    }

    const hotkeyAndDesc = locations[currentLocation]["ALT"].map(
        (hotkeyAction) => {
            /// Will only add permissions logic to ALT and OPT. If any other permission appear it should be added to the handler key
            if (permissions) {
                if (
                    permissions[
                        currentLocation +
                            "/alt/" +
                            hotkeyAction.hotkey.toLowerCase()
                    ] === undefined ||
                    permissions[
                        currentLocation +
                            "/alt/" +
                            hotkeyAction.hotkey.toLowerCase()
                    ]
                ) {
                    return hotkeyAction.description
                }
            } else {
                return hotkeyAction.description
            }

            return undefined
        }
    )

    return (
        hotkeyAndDesc.length > 0 ||
        locations[currentLocation]["CTRL"].length > 0 ||
        locations[currentLocation]["CTRLALT"].length > 0
    )
}

export const useHotkeysByPath = (currentLocation?: string) => {
    const history = useOnMountHistory()
    currentLocation = currentLocation ?? history.location.pathname

    if (!locations[currentLocation]) {
        return ""
    }

    return locations[currentLocation]
}
