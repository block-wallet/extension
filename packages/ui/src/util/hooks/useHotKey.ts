import { useHotkeys } from "react-hotkeys-hook"
import { lockApp } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { getActionByHotkeyAndPath, getHokeyByPath } from "../hotkeys"
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
    const hotKeys = getHokeyByPath(currentLocation)
    console.log("hotkeys to listen[" + currentLocation + "]: " + hotKeys)
    useHotkeys(
        hotKeys + ",ctrl+alt+l,alt+backspace,alt+q",
        (e, handler) => {
            if (!handler.keys || !handler.keys[0]) {
                return
            }
            const keyPressed = handler.keys[0]

            //logout --ctrl+alt+l
            if (handler.ctrl && handler.alt && keyPressed === "l") {
                lockApp()
                return
            }

            //Page back --alt + backspace
            if (handler.alt && keyPressed === "backspace") {
                if (onBack) return onBack(e)
                return
            }

            //Close extension --alt+q
            if (handler.alt && keyPressed === "q") {
                if (onClose) return onClose(e)
                return
            }

            const navigateTo = getActionByHotkeyAndPath(
                currentLocation,
                keyPressed,
                handler.alt && handler.ctrl
                    ? "CTRLALT"
                    : handler.alt
                    ? "ALT"
                    : "CTRL"
            )

            if (navigateTo) {
                console.log("Pasamos por aca!")
                if (typeof navigateTo === "string") {
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
