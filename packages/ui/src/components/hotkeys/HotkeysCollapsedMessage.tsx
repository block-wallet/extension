import { FC, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import CollapsableMessage from "../CollapsableMessage"
import { DisplayHotkeysByPath } from "../hotkeys/DisplayHotkey"
import ConfirmDialog from "../dialog/ConfirmDialog"
import { componentsHotkeys } from "../../util/hotkeys"

export const HotkeysCollapsedMessage: FC<{
    hotkeysPermissions?: { [action: string]: boolean }
}> = ({ hotkeysPermissions }) => {
    const history = useOnMountHistory()
    const currentLocation = history.location.pathname
    const [isMessageVisible, setIsMessageVisible] = useState(false)
    const { hotkeysEnabled } = useBlankState()!

    const hotkeysCollapsedMessageHotkeys =
        componentsHotkeys.HotkeysCollapsedMessage
    useHotkeys(hotkeysCollapsedMessageHotkeys, (e) => {
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

    return hotkeysEnabled ? (
        <CollapsableMessage
            dialog={{
                title: "",
                message: (
                    <div className="flex flex-col w-full font-semibold text-sm">
                        <DisplayHotkeysByPath
                            pathName={currentLocation}
                            permissions={hotkeysPermissions}
                            includeDivider={true}
                        />
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
    ) : (
        <ConfirmDialog
            title="Keyboard Shortcuts"
            message={
                "Keyboard shortcuts are turned off. Turn them on in Settings"
            }
            open={isMessageVisible}
            onClose={() => setIsMessageVisible(false)}
            onConfirm={() => {
                history.push("/settings/preferences/hotkeys")
            }}
            confirmText="Settings"
        />
    )
}

export default HotkeysCollapsedMessage
