import { useHotkeys } from "react-hotkeys-hook"
import { useBlankState } from "../../context/background/backgroundHooks"
import { lockApp } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { getActionByHotkeyAndPath, getHotkeyByPath } from "../hotkeys"
/**
 * Hook to handle the hotkeys for each page
 */

export interface UseHotKeyProps {
    onClose?: (event: any) => void
    onBack?: (event: any) => void // in case we want to replace default back behavior
    permissions?: { [action: string]: boolean }
}

const useHotKey = (
    { onClose, onBack, permissions }: UseHotKeyProps = {
        onClose: undefined,
        onBack: undefined,
    }
) => {
    const { hotkeysEnabled } = useBlankState()!
    const history = useOnMountHistory()
    const currentLocation = history.location.pathname
    const hotKeys = getHotkeyByPath(currentLocation)

    useHotkeys(
        hotKeys + ",ctrl+alt+l,alt+backspace,alt+q",
        (e) => {
            if (!hotkeysEnabled) return
            if (!e.key) {
                return
            }
            const keyPressed = e.code
                .replace(/key/i, "")
                .replace(/digit/i, "")
                .replace(/numpad/i, "")
                .toLowerCase()

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
                    //Need to validate permissions
                    if (
                        permissions &&
                        permissions[navigateTo] !== undefined &&
                        !permissions[navigateTo]
                    ) {
                        return
                    }

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
        { enableOnFormTags: true, preventDefault: true }
    )
}

export default useHotKey
