import { useHotkeys } from "react-hotkeys-hook"
import { lockApp } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { getActionByHotkeyAndPath, getHotkeyByPath } from "../hotkeys"
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
    const currentLocation = history.location.pathname
    const hotKeys = getHotkeyByPath(currentLocation)
    useHotkeys(
        hotKeys + ",ctrl+alt+l,alt+backspace,alt+q",
        (e, handler) => {
            if (!e.key) {
                return
            }
            const keyPressed = e.key.toLowerCase()

            //logout --ctrl+alt+l
            if (e.ctrlKey && e.altKey && keyPressed === "l") {
                lockApp()
                return
            }

            //Page back --alt + backspace
            if (e.altKey && keyPressed === "backspace") {
                if (onBack) return onBack(e)
                return
            }

            //Close extension --alt+q
            if (e.altKey && keyPressed === "q") {
                if (onClose) return onClose(e)
                return
            }

            const navigateTo = getActionByHotkeyAndPath(
                currentLocation,
                keyPressed,
                e.altKey && e.ctrlKey ? "CTRLALT" : e.altKey ? "ALT" : "CTRL"
            )

            if (navigateTo) {
                if (typeof navigateTo === "string") {
                    console.log("NavigateTo")
                    history.push({
                        pathname: navigateTo,
                        state: {
                            from: history.location.pathname,
                            //Acordarse revisar el estado del state
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
