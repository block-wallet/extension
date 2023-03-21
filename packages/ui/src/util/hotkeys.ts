import { openHardwareConnect } from "../context/commActions"
import { updatePopupTab } from "../context/commActions"
import { useOnMountHistory } from "../context/hooks/useOnMount"
import { getCurrentOS } from "../context/util/platform"

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
        OPT: HotkeyAction[]
        CTRLALT: HotkeyAction[]
        CTRLOPT: HotkeyAction[]
    }
}

const locations: HotkeyMap = {
    "/home": {
        ALT: [
            {
                hotkey: "a",
                action: "/accounts",
                hotkeyDescription: "ALT+a",
                description: "ALT+A - Accounts",
            },
            {
                hotkey: "b",
                action: "/bridge",
                hotkeyDescription: "ALT+b",
                description: "ALT+B - Bridge",
            },
            {
                hotkey: "s",
                action: "/send",
                hotkeyDescription: "ALT+s",
                description: "ALT+S - Send",
            },
            {
                hotkey: "w",
                action: "/swap",
                hotkeyDescription: "ALT+w",
                description: "ALT+W - Swap",
            },
            {
                hotkey: "r",
                action: "/accounts/menu/receive",
                hotkeyDescription: "ALT+r",
                description: "ALT+R - Receive Founds",
            },
            {
                hotkey: "1",
                action: () => updatePopupTab("activity"),
                hotkeyDescription: "ALT+1",
                description: "ALT+1 - Switch To Activity List",
            },
            {
                hotkey: "2",
                action: () => updatePopupTab("assets"),
                hotkeyDescription: "ALT+2",
                description: "ALT+2 - Switch To Assets List",
            },
            {
                //Leave empty to show it on Hotkeys popup, but it is executed from ActivityAssetsView
                hotkey: "",
                action: "",
                hotkeyDescription: "",
                description: "ALT+N - Add Token(On asset view)",
            },
            {
                hotkey: "",
                action: "",
                hotkeyDescription: "",
                description: "ALT+G - View Gas Prices",
            },
        ],
        CTRLALT: [
            {
                hotkey: "s",
                action: "/settings",
                hotkeyDescription: "CTRL+ALT+s",
                description: "CTRL+ALT+S - Settings",
            },
        ],
        CTRL: [],
        OPT: [
            {
                hotkey: "a",
                action: "/accounts",
                hotkeyDescription: "ALT+a",
                description: "OPT+A - Accounts",
            },
            {
                hotkey: "b",
                action: "/bridge",
                hotkeyDescription: "ALT+b",
                description: "OPT+B - Bridge",
            },
            {
                hotkey: "s",
                action: "/send",
                hotkeyDescription: "ALT+s",
                description: "OPT+S - Send",
            },
            {
                hotkey: "w",
                action: "/swap",
                hotkeyDescription: "ALT+w",
                description: "OPT+W - Swap",
            },
            {
                hotkey: "r",
                action: "/accounts/menu/receive",
                hotkeyDescription: "ALT+r",
                description: "OPT+R - Receive Founds",
            },
            {
                hotkey: "1",
                action: () => updatePopupTab("activity"),
                hotkeyDescription: "ALT+1",
                description: "OPT+1 - Switch To Activity List",
            },
            {
                hotkey: "2",
                action: () => updatePopupTab("assets"),
                hotkeyDescription: "ALT+2",
                description: "OPT+2 - Switch To Assets List",
            },
            {
                //Leave empty to show it on Hotkeys popup, but it is executed from ActivityAssetsView
                hotkey: "",
                action: "",
                hotkeyDescription: "",
                description: "OPT+N - Add Token(On asset view)",
            },
            {
                hotkey: "",
                action: "",
                hotkeyDescription: "",
                description: "OPT+G - View Gas Prices",
            },
        ],
        CTRLOPT: [
            {
                hotkey: "s",
                action: "/settings",
                hotkeyDescription: "CTRL+ALT+s",
                description: "CTRL+OPT+S - Settings",
            },
        ],
    },
    "/settings": {
        ALT: [
            {
                hotkey: "1",
                action: "/accounts/menu",
                hotkeyDescription: "ALT+1",
                description: "ALT+1 - Accounts",
            },
            {
                hotkey: "2",
                action: "/settings/networks",
                hotkeyDescription: "ALT+2",
                description: "ALT+2 - Networks",
            },
            {
                hotkey: "3",
                action: "/settings/addressBook",
                hotkeyDescription: "ALT+3",
                description: "ALT+3 - Address Book",
            },
            {
                hotkey: "4",
                action: "/settings/preferences",
                hotkeyDescription: "ALT+4",
                description: "ALT+4 - Preferences",
            },
            {
                hotkey: "5",
                action: openHardwareConnect,
                hotkeyDescription: "ALT+5",
                description: "ALT+5 - Connect Hardware Wallet",
            },
            {
                hotkey: "6",
                action: "/settings/about",
                hotkeyDescription: "ALT+6",
                description: "ALT+6 - About",
            },
        ],
        CTRL: [],
        CTRLALT: [],
        OPT: [
            {
                hotkey: "1",
                action: "/accounts/menu",
                hotkeyDescription: "ALT+1",
                description: "OPT+1 - Accounts",
            },
            {
                hotkey: "2",
                action: "/settings/networks",
                hotkeyDescription: "ALT+2",
                description: "OPT+2 - Networks",
            },
            {
                hotkey: "3",
                action: "/settings/addressBook",
                hotkeyDescription: "ALT+3",
                description: "OPT+3 - Address Book",
            },
            {
                hotkey: "4",
                action: "/settings/preferences",
                hotkeyDescription: "ALT+4",
                description: "OPT+4 - Preferences",
            },
            {
                hotkey: "5",
                action: openHardwareConnect,
                hotkeyDescription: "ALT+5",
                description: "OPT+5 - Connect Hardware Wallet",
            },
            {
                hotkey: "6",
                action: "/settings/about",
                hotkeyDescription: "ALT+6",
                description: "OPT+6 - About",
            },
        ],
        CTRLOPT: [],
    },
    "/accounts": {
        ALT: [
            {
                hotkey: "c",
                action: "/accounts/create",
                hotkeyDescription: "ALT+c",
                description: "ALT+C - Create Account",
            },
        ],
        OPT: [
            {
                hotkey: "c",
                action: "/accounts/create",
                hotkeyDescription: "ALT+c",
                description: "OPT+C - Create Account",
            },
        ],
        CTRL: [],
        CTRLALT: [],
        CTRLOPT: [],
    },
    "/accounts/create": {
        ALT: [
            {
                hotkey: "c",
                action: "/accounts/create/add",
                hotkeyDescription: "ALT+c",
                description: "ALT+C - Create Account",
            },
            {
                hotkey: "i",
                action: "/accounts/create/import",
                hotkeyDescription: "ALT+i",
                description: "ALT+I - Import Account",
            },
            {
                hotkey: "h",
                action: openHardwareConnect,
                hotkeyDescription: "ALT+h",
                description: "ALT+H - Connect Hardware Wallet",
            },
        ],
        OPT: [
            {
                hotkey: "c",
                action: "/accounts/create/add",
                hotkeyDescription: "ALT+c",
                description: "OPT+C - Create Account",
            },
            {
                hotkey: "i",
                action: "/accounts/create/import",
                hotkeyDescription: "ALT+i",
                description: "OPT+I - Import Account",
            },
            {
                hotkey: "h",
                action: openHardwareConnect,
                hotkeyDescription: "ALT+h",
                description: "OPT+H - Connect Hardware Wallet",
            },
        ],
        CTRL: [],
        CTRLALT: [],
        CTRLOPT: [],
    },
    "/accounts/menu": {
        ALT: [
            {
                hotkey: "r",
                action: "/accounts/menu/receive",
                hotkeyDescription: "ALT+r",
                description: "ALT+R - Receive Founds",
            },
            {
                hotkey: "c",
                action: "/accounts/menu/connectedsites",
                hotkeyDescription: "ALT+c",
                description: "ALT+C - Connected Sites",
            },
            {
                hotkey: "e",
                action: "/accounts/menu/export",
                hotkeyDescription: "ALT+x",
                description: "ALT+X - Export Account Data",
            },
            {
                hotkey: "",
                action: "",
                hotkeyDescription: "",
                description: "ALT+V - View on Etherscan",
            },
            {
                hotkey: "m",
                action: "/accounts",
                hotkeyDescription: "ALT+m",
                description: "ALT+M - Accounts",
            },
        ],
        CTRL: [],
        CTRLALT: [],
        OPT: [
            {
                hotkey: "r",
                action: "/accounts/menu/receive",
                hotkeyDescription: "ALT+r",
                description: "OPT+R - Receive Founds",
            },
            {
                hotkey: "c",
                action: "/accounts/menu/connectedsites",
                hotkeyDescription: "ALT+c",
                description: "OPT+C - Connected Sites",
            },
            {
                hotkey: "e",
                action: "/accounts/menu/export",
                hotkeyDescription: "ALT+e",
                description: "OPT+E - Export",
            },
            {
                hotkey: "",
                action: "",
                hotkeyDescription: "",
                description: "OPT+V - View on Etherscan",
            },
            {
                hotkey: "m",
                action: "/accounts",
                hotkeyDescription: "ALT+m",
                description: "OPT+M - Accounts",
            },
        ],
        CTRLOPT: [],
    },
    "/settings/networks": {
        ALT: [
            {
                hotkey: "n",
                action: "/settings/networks/search",
                hotkeyDescription: "ALT+n",
                description: "ALT+N - Add Network",
            },
        ],
        CTRL: [],
        CTRLALT: [],
        OPT: [
            {
                hotkey: "n",
                action: "/settings/networks/search",
                hotkeyDescription: "ALT+n",
                description: "OPT+N - Add Network",
            },
        ],
        CTRLOPT: [],
    },
    "/settings/addressBook": {
        ALT: [
            {
                hotkey: "n",
                action: "/settings/addressBook/add",
                hotkeyDescription: "ALT+n",
                description: "ALT+N - Add Address To Book",
            },
        ],
        CTRL: [],
        CTRLALT: [],
        OPT: [
            {
                hotkey: "n",
                action: "/settings/addressBook/add",
                hotkeyDescription: "ALT+n",
                description: "OPT+N - Add Address To Book",
            },
        ],
        CTRLOPT: [],
    },
    "/settings/preferences": {
        ALT: [
            {
                hotkey: "t",
                action: "/settings/preferences/locktimeout",
                hotkeyDescription: "ALT+t",
                description: "ALT+T - Lock Timeout",
            },
            {
                hotkey: "l",
                action: "/settings/preferences/locale",
                hotkeyDescription: "ALT+l",
                description: "ALT+L - Locale",
            },
            {
                hotkey: "r",
                action: "/settings/preferences/releasenotes",
                hotkeyDescription: "ALT+r",
                description: "ALT+R - Release Notes",
            },
            {
                hotkey: "d",
                action: "/settings/preferences/defaultwallet",
                hotkeyDescription: "ALT+d",
                description: "ALT+D - Default Wallet",
            },
            {
                hotkey: "w",
                action: "/settings/preferences/warnings",
                hotkeyDescription: "ALT+w",
                description: "ALT+W - Warnings",
            },
            {
                hotkey: "p",
                action: "/settings/preferences/phishing",
                hotkeyDescription: "ALT+p",
                description: "ALT+P - Phishing",
            },
        ],
        CTRL: [],
        CTRLALT: [],
        OPT: [
            {
                hotkey: "t",
                action: "/settings/preferences/locktimeout",
                hotkeyDescription: "ALT+t",
                description: "OPT+T - Lock Timeout",
            },
            {
                hotkey: "l",
                action: "/settings/preferences/locale",
                hotkeyDescription: "ALT+l",
                description: "OPT+L - Locale",
            },
            {
                hotkey: "r",
                action: "/settings/preferences/releasenotes",
                hotkeyDescription: "ALT+r",
                description: "OPT+R - Release Notes",
            },
            {
                hotkey: "d",
                action: "/settings/preferences/defaultwallet",
                hotkeyDescription: "ALT+d",
                description: "OPT+D - Default Wallet",
            },
            {
                hotkey: "w",
                action: "/settings/preferences/warnings",
                hotkeyDescription: "ALT+w",
                description: "OPT+W - Warnings",
            },
            {
                hotkey: "p",
                action: "/settings/preferences/phishing",
                hotkeyDescription: "ALT+p",
                description: "OPT+P - Phishing",
            },
        ],
        CTRLOPT: [],
    },
}

const currentOS = getCurrentOS()

export const getActionByHotkeyAndPath = (
    currentLocation: string,
    hotkey: string,
    handler: "CTRL" | "ALT" | "CTRLALT" | "OPT" | "CTRLOPT"
): Action => {
    if (currentOS === "mac") {
        if (handler === "ALT") handler = "OPT"
        if (handler === "CTRLALT") handler = "CTRLOPT"
    }

    return locations[currentLocation][handler].filter(
        (hotkeyAction) => hotkeyAction.hotkey === hotkey
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

    if (currentOS === "mac") {
        const optHotkeysByPath = locations[currentLocation]["OPT"]
            .map((hotkeyAction) => {
                return hotkeyAction.hotkeyDescription
            })
            .join(",")

        const ctrlOptHotkeysByPath = locations[currentLocation]["CTRLOPT"]
            .map((hotkeyAction) => {
                return hotkeyAction.hotkeyDescription
            })
            .join(",")

        return (
            optHotkeysByPath +
            "," +
            ctrlHotkeysByPath +
            "," +
            ctrlOptHotkeysByPath
        )
    } else {
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
            altHotkeysByPath +
            "," +
            ctrlHotkeysByPath +
            "," +
            ctrlAltHotkeysByPath
        )
    }
}

export const getHotkeyAndDescByPath = (
    currentLocation?: string,
    permissions?: { [action: string]: boolean }
) => {
    const history = useOnMountHistory()
    currentLocation = currentLocation ?? history.location.pathname

    if (!locations[currentLocation]) {
        return ""
    }

    let hotkeyAndDesc = [""]
    if (currentOS === "win") {
        hotkeyAndDesc = locations[currentLocation]["ALT"].map(
            (hotkeyAction) => {
                /// Will only add permissions logic to ALT and OPT. If any other permission appear it should be added to the handler key
                const action =
                    typeof hotkeyAction.action === "string"
                        ? hotkeyAction.action
                        : undefined

                if (
                    permissions &&
                    action &&
                    permissions[action] !== undefined &&
                    !permissions[action]
                ) {
                    return ""
                } else return hotkeyAction.description
            }
        )

        locations[currentLocation]["CTRL"].map((hotkeyAction) => {
            if (hotkeyAction.description) {
                hotkeyAndDesc.push(hotkeyAction.description)
            }
        })

        locations[currentLocation]["CTRLALT"].map((hotkeyAction) => {
            if (hotkeyAction.description) {
                hotkeyAndDesc.push(hotkeyAction.description)
            }
        })
    } else {
        hotkeyAndDesc = locations[currentLocation]["OPT"].map(
            (hotkeyAction) => {
                /// Will only add permissions logic to ALT and OPT. If any other permission appear it should be added to the handler key
                const action =
                    typeof hotkeyAction.action === "string"
                        ? hotkeyAction.action
                        : undefined
                if (
                    permissions &&
                    action &&
                    permissions[action] !== undefined &&
                    permissions[action]
                ) {
                    return hotkeyAction.description
                } else return ""
            }
        )

        locations[currentLocation]["CTRL"].map((hotkeyAction) => {
            if (hotkeyAction.description) {
                hotkeyAndDesc.push(hotkeyAction.description)
            }
        })

        locations[currentLocation]["CTRLOPT"].map((hotkeyAction) => {
            if (hotkeyAction.description) {
                hotkeyAndDesc.push(hotkeyAction.description)
            }
        })
    }

    return hotkeyAndDesc
}
