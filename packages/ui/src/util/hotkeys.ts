import { openHardwareConnect } from "../context/commActions"
import { updatePopupTab } from "../context/commActions"

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
                hotkey: "a",
                action: "/accounts",
                hotkeyDescription: "ALT+a",
                description: "ALT+a - <b>Accounts</b></br>",
            },
            {
                hotkey: "b",
                action: "/bridge",
                hotkeyDescription: "ALT+b",
                description: "ALT+b - <b>Bridge</b></br>",
            },
            {
                hotkey: "s",
                action: "/send",
                hotkeyDescription: "ALT+s",
                description: "ALT+s - <b>Send</b></br>",
            },
            {
                hotkey: "w",
                action: "/swap",
                hotkeyDescription: "ALT+w",
                description: "ALT+w - <b>Swap</b></br>",
            },
            {
                hotkey: "r",
                action: "/accounts/menu/receive</b></br>",
                hotkeyDescription: "ALT+r",
                description: "ALT+r - <b>Receive Founds</b></br>",
            },
            {
                hotkey: "1",
                action: () => updatePopupTab("activity"),
                hotkeyDescription: "ALT+1",
                description: "ALT+1 - <b>Switch To Activity List</b></br>",
            },
            {
                hotkey: "2",
                action: () => updatePopupTab("assets"),
                hotkeyDescription: "ALT+2",
                description: "ALT+2 - <b>Switch To Assets List</b></br>",
            },
            {
                hotkey: "n",
                action: "/settings/tokens/add",
                hotkeyDescription: "ALT+n",
                description: "ALT+n - <b>Add token</b></br>",
            },
        ],
        CTRLALT: [
            {
                hotkey: "s",
                action: "/settings",
                hotkeyDescription: "CTRL+ALT+s",
                description: "CTRL+ALT+s - <b>Settings</b></br>",
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
                description: "ALT+1 - <b>Accounts</b></br>",
            },
            {
                hotkey: "2",
                action: "/settings/networks",
                hotkeyDescription: "ALT+2",
                description: "ALT+2 - <b>Networks</b></br>",
            },
            {
                hotkey: "3",
                action: "/settings/addressBook",
                hotkeyDescription: "ALT+3",
                description: "ALT+3 - <b>Address Book</b></br>",
            },
            {
                hotkey: "4",
                action: "/settings/preferences",
                hotkeyDescription: "ALT+4",
                description: "ALT+4 - <b>Preferences</b></br>",
            },
            {
                hotkey: "5",
                action: openHardwareConnect,
                hotkeyDescription: "ALT+5",
                description: "ALT+5 - <b>Connect Hardware Wallet</b></br>",
            },
            {
                hotkey: "6",
                action: "/settings/about",
                hotkeyDescription: "ALT+6",
                description: "ALT+6 - <b>About</b></br>",
            },
        ],
        CTRL: [],
        CTRLALT: [],
    },
    "/accounts/menu": {
        ALT: [
            {
                hotkey: "r",
                action: "/accounts/menu/receive",
                hotkeyDescription: "ALT+r",
                description: "ALT+r - <b>Receive Founds</b></br>",
            },
            {
                hotkey: "c",
                action: "/accounts/menu/connectedsites",
                hotkeyDescription: "ALT+c",
                description: "ALT+c - <b>Connected Sites</b></br>",
            },
            {
                hotkey: "e",
                action: "/accounts/menu/export",
                hotkeyDescription: "ALT+e",
                description: "ALT+e - <b>Export</b></br>",
            },
            { hotkey: "v", action: "", hotkeyDescription: "", description: "" },
            {
                hotkey: "m",
                action: "/accounts",
                hotkeyDescription: "ALT+m",
                description: "ALT+m - <b>Accounts</b></br>",
            },
        ],
        CTRL: [],
        CTRLALT: [],
    },
    "/settings/networks": {
        ALT: [
            {
                hotkey: "n",
                action: "/settings/networks/search",
                hotkeyDescription: "ALT+n",
                description: "ALT+n - <b>Add Network</b></br>",
            },
        ],

        CTRL: [],
        CTRLALT: [],
    },
    "/settings/addressBook": {
        ALT: [
            {
                hotkey: "n",
                action: "/settings/addressBook/add",
                hotkeyDescription: "ALT+n",
                description: "ALT+n - <b>Add Address To Book</b></br>",
            },
        ],
        CTRL: [],
        CTRLALT: [],
    },
    "/settings/preferences": {
        ALT: [
            {
                hotkey: "t",
                action: "/settings/preferences/locktimeout",
                hotkeyDescription: "ALT+t",
                description: "ALT+t - <b>Lock Timeout</b></br>",
            },
            {
                hotkey: "l",
                action: "/settings/preferences/locale",
                hotkeyDescription: "ALT+l",
                description: "ALT+l - <b>Locale</b></br>",
            },
            {
                hotkey: "r",
                action: "/settings/preferences/releasenotes",
                hotkeyDescription: "ALT+r",
                description: "ALT+r - <b>Release Notes</b></br>",
            },
            {
                hotkey: "d",
                action: "/settings/preferences/defaultwallet",
                hotkeyDescription: "ALT+d",
                description: "ALT+d - <b>Default Wallet</b></br>",
            },
            {
                hotkey: "w",
                action: "/settings/preferences/warnings",
                hotkeyDescription: "ALT+w",
                description: "ALT+w - <b>Warnings</b></br>",
            },
            {
                hotkey: "p",
                action: "/settings/preferences/phishing",
                hotkeyDescription: "ALT+p",
                description: "ALT+p - <b>Phishing</b></br>",
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
    console.log("currentLocation: " + currentLocation)
    console.log("handler: " + handler)
    console.log("hotkey: " + hotkey)

    return locations[currentLocation][handler].filter(
        (hotkeyAction) => hotkeyAction.hotkey === hotkey
    )[0].action
}

export const getHokeyByPath = (currentLocation: string) => {
    if (!locations[currentLocation]) {
        return ""
    }
    const altHotkeysByPath = locations[currentLocation]["ALT"]
        .map((hotkeyAction) => {
            return hotkeyAction.hotkeyDescription
        })
        .join(",")
    const ctrlHotkeysByPath = locations[currentLocation]["CTRL"]
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

export const getHokeyAndDescByPath = (currentLocation: string) => {
    if (!locations[currentLocation]) {
        return ""
    }
    const altHotkeysByPath = locations[currentLocation]["ALT"]
        .map((hotkeyAction) => {
            return hotkeyAction.description
        })
        .join("<br/>")
    const ctrlHotkeysByPath = locations[currentLocation]["CTRL"]
        .map((hotkeyAction) => {
            return hotkeyAction.description
        })
        .join("<br/>")
    const ctrlAltHotkeysByPath = locations[currentLocation]["CTRLALT"]
        .map((hotkeyAction) => {
            return hotkeyAction.description
        })
        .join("<br/>")
    return altHotkeysByPath + ctrlHotkeysByPath + ctrlAltHotkeysByPath
}
