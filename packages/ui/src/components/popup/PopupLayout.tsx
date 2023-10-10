import { FunctionComponent, useLayoutEffect } from "react"
import { rejectUnconfirmedRequests } from "../../context/commActions"
import useBeforeunload from "../../context/hooks/useBeforeUnload"
import usePreventWindowResize from "../../context/hooks/usePreventWindowResize"
import { isAutomaticClose } from "../../context/setup"
import useSubmitOnEnter, {
    submitOnEnterProps,
} from "../../util/hooks/useSubmitOnEnter"
import { useCheckLocationHotkeys } from "../../util/hotkeys"
import PageLayout from "../PageLayout"
import ProviderStatus from "../chain/ProviderStatus"
import HotkeysCollapsedMessage from "../hotkeys/HotkeysCollapsedMessage"

const PopupLayout: FunctionComponent<{
    header?: React.ReactNode
    showProviderStatus?: boolean
    footer?: React.ReactNode
    children: React.ReactNode | undefined
    submitOnEnter?: submitOnEnterProps
    hotkeysPermissions?: { [action: string]: boolean }
}> = ({
    header,
    children,
    footer,
    submitOnEnter,
    showProviderStatus,
    hotkeysPermissions,
}) => {
    const { preventResize, cancelPreventResize } = usePreventWindowResize()

    const fullHeader = (
        <>
            {header}
            <hr className="border-0.5 border-primary-grey-hover w-full" />
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

    const padding = { paddingTop: header ? "69px" : "0" }

    //Lets check if this currentLocation has hotkeys, in case we have something we show it in footer.
    const hotkeyByPath = useCheckLocationHotkeys(hotkeysPermissions)
    return (
        <PageLayout screen className="max-h-screen popup-layout">
            <div className="absolute top-0 left-0 w-full popup-layout z-40">
                {fullHeader}
            </div>
            <div
                className="flex-1 flex flex-col w-full h-0 max-h-screen overflow-auto main-content"
                style={padding}
            >
                {showProviderStatus && <ProviderStatus />}
                {children}
            </div>
            {footer ? (
                <>
                    <hr className="border-0.5 border-primary-grey-hover w-full" />
                    {footer}
                    {hotkeyByPath && (
                        <HotkeysCollapsedMessage
                            hotkeysPermissions={hotkeysPermissions}
                        />
                    )}
                </>
            ) : (
                hotkeyByPath && (
                    <HotkeysCollapsedMessage
                        hotkeysPermissions={hotkeysPermissions}
                    />
                )
            )}
        </PageLayout>
    )
}

export default PopupLayout
