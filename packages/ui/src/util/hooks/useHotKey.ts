import { useHotkeys } from "react-hotkeys-hook"
import { lockApp } from "../../context/commActions"
import { openHardwareConnect } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { updatePopupTab } from "../../context/commActions"
/**
 * Hook to handle the hotkeys for each page
 */

export interface UseHotKeyProps {
    onClose?: (event: any) => void
    onBack?: (event: any) => void // in case we want to replace default back behavior
    onTabChange?: (value: any) => void //It is used in activityAssetsView to move between tabs
}

const useHotKey = (
    { onClose, onBack }: UseHotKeyProps = {
        onClose: undefined,
        onBack: undefined,
    }
) => {
    const history = useOnMountHistory()
    type Location = {
        [key: string]: string | ((p?: any) => Promise<any>)
    }

    type Locations = {
        [key: string]: Location
    }

    useHotkeys(
        "ctrl+alt+l,alt+backspace,alt+s,alt+p,ctrl+alt+s,alt+1,alt+2,alt+3,alt+4,alt+5,alt+6,alt+d,alt+w,alt+q",
        (e, handler) => {
            //logout
            if (handler.key === "ctrl+alt+l") {
                console.log("Logging out")
                lockApp()
                return
            }

            //Page back
            if (handler.key === "alt+backspace") {
                if (onBack) return onBack(e)
                return
            }

            //Close extension
            if (handler.key === "alt+q") {
                if (onClose) return onClose(e)
                return
            }

            const currentLocation = history.location.pathname
                .toUpperCase()
                .replace("/", "")

            const locations: Locations = {
                HOME: {
                    "alt+s": "/send",
                    "alt+p": "/privacy",
                    "ctrl+alt+s": "/settings",
                    "alt+1": () => updatePopupTab("activity"),
                    "alt+2": () => updatePopupTab("assets"),
                },
                SETTINGS: {
                    "alt+1": "/accounts/menu",
                    "alt+2": "/settings/networks",
                    "alt+3": "/settings/addressBook",
                    "alt+4": "/settings/preferences",
                    "alt+5": openHardwareConnect,
                    "alt+6": "/settings/about",
                },
                PRIVACY: {
                    "alt+d": "/privacy/deposit",
                    "alt+w": "/privacy/withdraw",
                },
            }

            if (
                currentLocation in locations &&
                handler.key in locations[currentLocation]
            ) {
                const navigateTo = locations[currentLocation][handler.key]
                if (typeof navigateTo === "string") {
                    history.push({
                        pathname: navigateTo,
                        state: {
                            from: history.location.pathname,
                        },
                    })

                    return
                }

                navigateTo()
            }
        },
        []
    )
}

export default useHotKey
