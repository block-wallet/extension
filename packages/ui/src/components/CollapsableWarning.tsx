import { useState } from "react"
import ErrorDialog from "./dialog/ErrorDialog"
import WarningDialog from "./dialog/WarningDialog"

interface CollapsableWarningProps {
    isCollapsedByDefault: boolean
    type?: "warn" | "error"
    onDismiss?: () => void
    dialog: {
        title: string
        message: JSX.Element | string
    }
    collapsedMessage: JSX.Element | string
}
const CollapsableWarning = ({
    isCollapsedByDefault,
    onDismiss,
    dialog,
    type = "warn",
    collapsedMessage,
}: CollapsableWarningProps) => {
    const [isCollapsed, setIsCollapsed] = useState(isCollapsedByDefault)

    const onClose = () => {
        setIsCollapsed(true)
        if (onDismiss) {
            onDismiss()
        }
    }

    const Dialog = type === "warn" ? WarningDialog : ErrorDialog

    return (
        <>
            <div
                onClick={() => setIsCollapsed(false)}
                className="cursor-pointer"
            >
                {collapsedMessage}
            </div>
            {!isCollapsed && (
                <Dialog
                    open={true}
                    title={dialog.title}
                    message={dialog.message}
                    buttonLabel="OK"
                    onCancel={onClose}
                    onDone={onClose}
                />
            )}
        </>
    )
}

export default CollapsableWarning
