import { useState } from "react"
import ErrorDialog from "./dialog/ErrorDialog"
import MessageDialog from "./dialog/MessageDialog"
import WarningDialog from "./dialog/WarningDialog"

interface CollapsableMessageProps {
    isCollapsedByDefault: boolean
    type?: "warn" | "error" | "info"
    onDismiss?: () => void
    dialog: {
        title: string
        message: JSX.Element | string
    }
    collapsedMessage: JSX.Element | string
    showCollapsedMessage?: boolean
}
const CollapsableMessage = ({
    isCollapsedByDefault,
    onDismiss,
    dialog,
    type = "warn",
    collapsedMessage,
    showCollapsedMessage = false,
}: CollapsableMessageProps) => {
    const [isCollapsed, setIsCollapsed] = useState(isCollapsedByDefault)

    const onClose = () => {
        setIsCollapsed(true)
        if (onDismiss) {
            onDismiss()
        }
    }

    let Dialog
    switch (type) {
        case "warn":
            Dialog = WarningDialog
            break
        case "error":
            Dialog = ErrorDialog
            break
        case "info":
            Dialog = MessageDialog
    }

    return (
        <>
            <div
                onClick={() => setIsCollapsed(false)}
                className="cursor-pointer"
            >
                {collapsedMessage}
            </div>
            {(!isCollapsed || showCollapsedMessage) && (
                <Dialog
                    open={true}
                    title={dialog.title}
                    message={dialog.message}
                    buttonLabel="OK"
                    onCancel={onClose}
                    onDone={onClose}
                    onClickOutside={onClose}
                />
            )}
        </>
    )
}

export default CollapsableMessage
