import { FC, FunctionComponent, useLayoutEffect, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { rejectUnconfirmedRequests } from "../../context/commActions"
import useBeforeunload from "../../context/hooks/useBeforeUnload"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import usePreventWindowResize from "../../context/hooks/usePreventWindowResize"
import { isAutomaticClose } from "../../context/setup"
import useSubmitOnEnter, {
    submitOnEnterProps,
} from "../../util/hooks/useSubmitOnEnter"
import { checkLocationHotkeys } from "../../util/hotkeys"
import CollapsableMessage from "../CollapsableMessage"
import { DisplayHotkeysByPath } from "../hotkeys/DisplayHotkey"
import PageLayout from "../PageLayout"

const CollapsedMessage: FC<{
    hotkeysPermissions?: { [action: string]: boolean }
}> = ({ hotkeysPermissions }) => {
    const history = useOnMountHistory()
    const [isMessageVisible, setIsMessageVisible] = useState(false)
    const currentLocation = history.location.pathname

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
        <div className="w-full pr-6">
            <div className="flex flex-row items-start w-full justify-end pt-1 pb-2">
                <CollapsableMessage
                    dialog={{
                        title: "Screen hotkeys",
                        message: (
                            <div className="flex flex-col p-6 space-y-1 w-full">
                                <DisplayHotkeysByPath
                                    pathName={currentLocation}
                                    permissions={hotkeysPermissions}
                                />
                            </div>
                        ),
                    }}
                    type="info"
                    isCollapsedByDefault
                    showCollapsedMessage={isMessageVisible}
                    collapsedMessage={""}
                    onDismiss={() => setIsMessageVisible(false)}
                />
            </div>
        </div>
    )
}

const PopupLayout: FunctionComponent<{
    header?: React.ReactNode
    footer?: React.ReactNode
    children: React.ReactNode | undefined
    submitOnEnter?: submitOnEnterProps
    hotkeysPermissions?: { [action: string]: boolean }
}> = ({ header, children, footer, submitOnEnter, hotkeysPermissions }) => {
    const { preventResize, cancelPreventResize } = usePreventWindowResize()
    const fullHeader = (
        <>
            {header}
            <hr className="border-0.5 border-gray-200 w-full" />
        </>
    )

    useBeforeunload(() => {
        if (!isAutomaticClose) {
            rejectUnconfirmedRequests()
        }
    })

    useLayoutEffect(() => {
        preventResize()
        return () => cancelPreventResize()
    }, [preventResize, cancelPreventResize])

    useSubmitOnEnter(submitOnEnter ?? {})

    //Lets check if this currentLocation has hotkeys, in case we have something we show it in footer.
    const hotkeyByPath = checkLocationHotkeys(hotkeysPermissions)
    return (
        <PageLayout screen className="max-h-screen popup-layout">
            <div className="absolute top-0 left-0 w-full popup-layout z-10">
                {fullHeader}
            </div>
            <div className="invisible w-full">{fullHeader}</div>
            <div className="flex-1 flex flex-col w-full h-0 max-h-screen overflow-auto main-content">
                {children}
            </div>
            {footer ? (
                <>
                    <hr className="border-0.5 border-gray-200 w-full" />
                    {footer}
                    {hotkeyByPath && (
                        <CollapsedMessage
                            hotkeysPermissions={hotkeysPermissions}
                        />
                    )}
                </>
            ) : (
                hotkeyByPath && (
                    <CollapsedMessage hotkeysPermissions={hotkeysPermissions} />
                )
            )}
        </PageLayout>
    )
}

export default PopupLayout
