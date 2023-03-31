import { FC, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import CollapsableMessage from "../CollapsableMessage"
import { DisplayHotkeysByPath } from "../hotkeys/DisplayHotkey"

export const HotkeysCollapsedMessage: FC<{
    hotkeysPermissions?: { [action: string]: boolean }
}> = ({ hotkeysPermissions }) => {
    const history = useOnMountHistory()
    const currentLocation = history.location.pathname
    const [isMessageVisible, setIsMessageVisible] = useState(false)
    const { hotkeysEnabled } = useBlankState()!

    useHotkeys("alt+k, enter", (e) => {
        const keyPressed = e.code
            .replace(/key/i, "")
            .replace(/digit/i, "")
            .replace(/numpad/i, "")
            .toLowerCase()
        if (e.altKey && keyPressed === "k") {
            setIsMessageVisible(true)
        } else {
            setIsMessageVisible(false)
        }
    })

    return (
        <CollapsableMessage
            dialog={{
                title: "",
                message: hotkeysEnabled ? (
                    <div className="flex flex-col p-4 w-full font-semibold text-sm">
                        <DisplayHotkeysByPath
                            pathName={currentLocation}
                            permissions={hotkeysPermissions}
                            includeDivider={true}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col p-4 w-full text-sm text-gray-500">
                        Keyboard shortcuts are turned off. Turn them on in
                        Settings
                    </div>
                ),
            }}
            type="hotkeys"
            isCollapsedByDefault
            showCollapsedMessage={isMessageVisible}
            collapsedMessage={""}
            onDismiss={() => setIsMessageVisible(false)}
            onConfirm={() => {
                history.push("/settings/preferences/hotkeys")
            }}
            showSubHeader={hotkeysEnabled}
        />
    )
}

export default HotkeysCollapsedMessage
