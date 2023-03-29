import classnames from "classnames"
import React from "react"
import { FC } from "react"
import { getCurrentOS } from "../../context/util/platform"
import { getHotkeysByPath } from "../../util/hotkeys"
import Divider from "../Divider"

interface DisplayHotkeyProps {
    description: string
    alt?: boolean
    ctrl?: boolean
    hotkey: string
    className?: string
    currentOS: "win" | "mac" | "UNIX" | "Linux" | undefined
}

interface DisplayHotkeysByPathProp {
    pathName: string
    permissions?: { [action: string]: boolean }
    includeDivider?: boolean
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
                        <div
                            className="border border-gray-400 rounded-sm p-2 font-medium text-sm"
                            style={{
                                boxShadow:
                                    "0px 2px 0px 0px rgba(240, 240, 240, 1)",
                            }}
                        >
                            Ctrl
                        </div>
                        <div className="p-2 font-medium text-sm">+</div>
                    </>
                )}
                {alt && (
                    <>
                        <div
                            className="border border-gray-400 rounded-sm p-2 font-medium text-sm"
                            style={{
                                boxShadow:
                                    "0px 2px 0px 0px rgba(240, 240, 240, 1)",
                            }}
                        >
                            {currentOS === "mac" ? "⌥" : "Alt"}
                        </div>
                        <div className="p-2 font-medium text-sm">+</div>
                    </>
                )}
                <div
                    className="border border-gray-400 rounded-sm p-2 font-medium w-7 text-sm"
                    style={{
                        boxShadow: "0px 2px 0px 0px rgba(240, 240, 240, 1)",
                    }}
                >
                    {hotkey}
                </div>
            </div>
        </div>
    )
}

export const DisplayHotkeysByPath: FC<DisplayHotkeysByPathProp> = ({
    pathName,
    permissions,
    includeDivider,
}) => {
    const hotkeys = getHotkeysByPath(pathName)
    const currentOS = getCurrentOS()

    let hotkeysElement: JSX.Element[]
    let showDivider = false
    if (hotkeys !== "") {
        hotkeysElement = hotkeys["ALT"].map((hotkey, index) => {
            const action =
                typeof hotkey.action === "string" ? hotkey.action : undefined

            if (
                !(
                    permissions &&
                    action &&
                    permissions[action] !== undefined &&
                    !permissions[action]
                )
            ) {
                if (index > 0 && !showDivider) showDivider = true
                return (
                    <React.Fragment key={index}>
                        {includeDivider && showDivider && (
                            <Divider className="my-4 border-gray-300" />
                        )}
                        <DisplayHotkey
                            alt
                            description={hotkey.description}
                            hotkey={hotkey.hotkey}
                            currentOS={currentOS}
                        />
                    </React.Fragment>
                )
            } else {
                return <React.Fragment key={index}></React.Fragment>
            }
        })

        hotkeys["CTRLALT"].map((hotkey, index) => {
            if (index > 0 && !showDivider) showDivider = true
            hotkeysElement.push(
                <React.Fragment key={index}>
                    {includeDivider && showDivider && (
                        <Divider className="my-4 border-gray-300" />
                    )}
                    <DisplayHotkey
                        ctrl
                        alt
                        description={hotkey.description}
                        hotkey={hotkey.hotkey}
                        currentOS={currentOS}
                    />
                </React.Fragment>
            )
        })

        hotkeys["CTRL"].map((hotkey, index) => {
            if (index > 0 && !showDivider) showDivider = true
            hotkeysElement.push(
                <React.Fragment key={index}>
                    {includeDivider && showDivider && (
                        <Divider className="my-4 border-gray-300" />
                    )}
                    <DisplayHotkey
                        ctrl
                        description={hotkey.description}
                        hotkey={hotkey.hotkey}
                        currentOS={currentOS}
                    />
                </React.Fragment>
            )
        })

        return <>{hotkeysElement}</>
    }

    return <></>
}

export default { DisplayHotkey, DisplayHotkeysByPath }
