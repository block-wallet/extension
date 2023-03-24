import classnames from "classnames"
import { FC } from "react"
import { getCurrentOS } from "../../context/util/platform"
import { getHotkeysByPath } from "../../util/hotkeys"

interface DisplayHotkeyProps {
    description: string
    alt: boolean
    ctrl?: boolean
    hotkey: string
    className?: string
    currentOS: "win" | "mac" | "UNIX" | "Linux" | undefined
}

interface DisplayHotkeysByPathProp {
    pathName: string
    permissions?: { [action: string]: boolean }
}

export const DisplayHotkey: FC<DisplayHotkeyProps> = ({
    description,
    alt = false,
    ctrl = false,
    hotkey,
    className = "",
    currentOS,
}) => {
    return (
        <div
            className={classnames(
                "flex items-center justify-between w-full",
                className
            )}
        >
            <div className="font-bold text-sm">{description}</div>
            <div className="flex">
                {ctrl && (
                    <>
                        <div className="border border-gray-400 rounded-sm p-2 font-bold">
                            Ctrl
                        </div>
                        <div className="p-2">+</div>
                    </>
                )}
                {alt && (
                    <>
                        <div className="border border-gray-400 rounded-sm p-2 font-bold">
                            {currentOS === "mac" ? "Opt" : "Alt"}
                        </div>
                        <div className="p-2">+</div>
                    </>
                )}
                <div className="border border-gray-400 rounded-sm p-2 font-bold">
                    {hotkey}
                </div>
            </div>
        </div>
    )
}

export const DisplayHotkeysByPath: FC<DisplayHotkeysByPathProp> = ({
    pathName,
    permissions,
}) => {
    const hotkeys = getHotkeysByPath(pathName)
    const currentOS = getCurrentOS()

    let hotkeysElement: JSX.Element[]
    if (hotkeys !== "") {
        hotkeysElement = hotkeys["ALT"].map((hotkey) => {
            const action =
                typeof hotkey.action === "string" ? hotkey.action : undefined

            if (
                permissions &&
                action &&
                permissions[action] !== undefined &&
                !permissions[action]
            ) {
                return <></>
            } else
                return (
                    <DisplayHotkey
                        alt
                        description={hotkey.description}
                        hotkey={hotkey.hotkey}
                        currentOS={currentOS}
                    />
                )
        })

        hotkeys["CTRLALT"].map((hotkey) => {
            hotkeysElement.push(
                <DisplayHotkey
                    alt
                    description={hotkey.description}
                    hotkey={hotkey.hotkey}
                    currentOS={currentOS}
                />
            )
        })

        hotkeys["CTRL"].map((hotkey) => {
            hotkeysElement.push(
                <DisplayHotkey
                    alt
                    description={hotkey.description}
                    hotkey={hotkey.hotkey}
                    currentOS={currentOS}
                />
            )
        })

        return <>{hotkeysElement}</>
    }

    return <></>
}

export default { DisplayHotkey, DisplayHotkeysByPath }
