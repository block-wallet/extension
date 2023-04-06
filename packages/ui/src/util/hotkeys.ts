import { openHardwareConnect } from "../context/commActions"
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
        ],
        CTRLALT: [
            {
                hotkey: "S",
                action: "/settings",
                hotkeyDescription: "CTRL+ALT+S",
                description: "Settings",
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
                action: openHardwareConnect,
                hotkeyDescription: "ALT+5",
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
                description: "Create account",
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
                description: "Create account",
            },
            {
                hotkey: "I",
                action: "/accounts/create/import",
                hotkeyDescription: "ALT+I",
                description: "Import account",
            },
            {
                hotkey: "H",
                action: openHardwareConnect,
                hotkeyDescription: "ALT+H",
                description: "Connect hardware wallet",
            },
        ],
        CTRL: [],
        CTRLALT: [],
    },
    "/accounts/menu": {
        ALT: [
            {
                hotkey: "R",
                action: "/accounts/menu/receive",
                hotkeyDescription: "ALT+R",
                description: "Receive funds",
            },
            {
                hotkey: "C",
                action: "/accounts/menu/connectedsites",
                hotkeyDescription: "ALT+C",
                description: "Connected sites",
            },
            {
                hotkey: "E",
                action: "/accounts/menu/export",
                hotkeyDescription: "ALT+X",
                description: "Export",
            },
            {
                hotkey: "V",
                action: "",
                hotkeyDescription: "",
                description: "View on explorer",
            },
            {
                hotkey: "T",
                action: "/accounts/menu/allowances",
                hotkeyDescription: "ALT+T",
                description: "Token allowances",
            },
            {
                hotkey: "M",
                action: "/accounts",
                hotkeyDescription: "ALT+M",
                description: "My accounts",
            },
            {
                hotkey: "S",
                action: "/accounts/menu/reset",
                hotkeyDescription: "ALT+S",
                description: "Reset account",
            },
        ],
        CTRL: [],
        CTRLALT: [],
    },
    "/accounts/menu/allowances": { ALT: [], CTRL: [], CTRLALT: [] },
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
                hotkey: "T",
                action: "/settings/preferences/locktimeout",
                hotkeyDescription: "ALT+T",
                description: "Lock timeout",
            },
            {
                hotkey: "L",
                action: "/settings/preferences/locale",
                hotkeyDescription: "ALT+L",
                description: "Locale configuration",
            },
            {
                hotkey: "R",
                action: "/settings/preferences/releasenotes",
                hotkeyDescription: "ALT+R",
                description: "Release notes",
            },
            {
                hotkey: "D",
                action: "/settings/preferences/defaultwallet",
                hotkeyDescription: "ALT+D",
                description: "Default wallet",
            },
            {
                hotkey: "W",
                action: "/settings/preferences/warnings",
                hotkeyDescription: "ALT+W",
                description: "Notifications & warnings",
            },
            {
                hotkey: "P",
                action: "/settings/preferences/phishing",
                hotkeyDescription: "ALT+P",
                description: "Phishing protection",
            },
            {
                hotkey: "H",
                action: "/settings/preferences/hotkeys",
                hotkeyDescription: "ALT+H",
                description: "Hotkeys",
            },
            {
                hotkey: "G",
                action: "/settings/preferences/defaultGas",
                hotkeyDescription: "ALT+G",
                description: "Default gas setting",
            },
        ],
        CTRL: [],
        CTRLALT: [],
    },
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
export const checkLocationHotkeys = (
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
        }
    )

    return (
        hotkeyAndDesc.length > 0 ||
        locations[currentLocation]["CTRL"].length > 0 ||
        locations[currentLocation]["CTRLALT"].length > 0
    )
}

export const getHotkeysByPath = (currentLocation?: string) => {
    const history = useOnMountHistory()
    currentLocation = currentLocation ?? history.location.pathname

    if (!locations[currentLocation]) {
        return ""
    }

    return locations[currentLocation]
}
