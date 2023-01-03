import { FunctionComponent, useLayoutEffect, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { AiFillQuestionCircle } from "react-icons/ai"
import { rejectUnconfirmedRequests } from "../../context/commActions"
import useBeforeunload from "../../context/hooks/useBeforeUnload"
import usePreventWindowResize from "../../context/hooks/usePreventWindowResize"
import { isAutomaticClose } from "../../context/setup"
import useSubmitOnEnter, {
    submitOnEnterProps,
} from "../../util/hooks/useSubmitOnEnter"
import { getHotkeyAndDescByPath } from "../../util/hotkeys"
import CollapsableMessage from "../CollapsableMessage"
import PageLayout from "../PageLayout"

const CollapsedMessage: FunctionComponent<{ hotkeyByPath: string[] }> = ({
    hotkeyByPath,
}) => {
    const [isMessageVisible, setIsMessageVisible] = useState(false)

    useHotkeys("alt+h", () => {
        if (hotkeyByPath && hotkeyByPath.length > 0) {
            setIsMessageVisible(true)
        }
    })

    useHotkeys("enter", () => {
        setIsMessageVisible(false)
    })
    return (
        <div className="w-full pr-6">
            <div className="flex flex-row items-start w-full justify-end pt-1 pb-2">
                <CollapsableMessage
                    dialog={{
                        title: "Screen hotkeys",
                        message: (
                            <>
                                {hotkeyByPath.map((hotkeyAndDesc) => {
                                    return (
                                        <span key={hotkeyAndDesc}>
                                            <b>{hotkeyAndDesc}</b>
                                            <br />
                                        </span>
                                    )
                                })}
                            </>
                        ),
                    }}
                    type="info"
                    isCollapsedByDefault
                    showCollapsedMessage={isMessageVisible}
                    collapsedMessage={
                        <AiFillQuestionCircle
                            size={26}
                            className="pl-2 text-primary-200 cursor-pointer hover:text-primary-300"
                            title="Hotkeys - Alt+H"
                        />
                    }
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
}> = ({ header, children, footer, submitOnEnter }) => {
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
    const hotkeyByPath = getHotkeyAndDescByPath()
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
                    {hotkeyByPath && hotkeyByPath.length > 0 && (
                        <CollapsedMessage hotkeyByPath={hotkeyByPath} />
                    )}
                </>
            ) : hotkeyByPath && hotkeyByPath.length > 0 ? (
                <CollapsedMessage hotkeyByPath={hotkeyByPath} />
            ) : null}
        </PageLayout>
    )
}

export default PopupLayout
