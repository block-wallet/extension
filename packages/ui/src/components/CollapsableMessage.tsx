import { useState } from "react"
import { Classes } from "../styles"
import { ButtonWithLoading } from "./button/ButtonWithLoading"
import ErrorDialog from "./dialog/ErrorDialog"
import HotkeysDialog from "./dialog/HotkeysDialog"
import MessageDialog from "./dialog/MessageDialog"
import WarningDialog from "./dialog/WarningDialog"

interface CollapsableMessageProps {
    isCollapsedByDefault: boolean
    type?: "warn" | "error" | "info" | "hotkeys"
    onDismiss?: () => void
    dialog: {
        title: string
        message: JSX.Element | string
    }
    collapsedMessage: JSX.Element | string
    showCollapsedMessage?: boolean
    onConfirm?: () => void
    showSubHeader?: boolean
}
const CollapsableMessage = ({
    isCollapsedByDefault,
    onDismiss,
    dialog,
    type = "warn",
    collapsedMessage,
    showCollapsedMessage = false,
    onConfirm,
    showSubHeader,
}: CollapsableMessageProps) => {
    const [isCollapsed, setIsCollapsed] = useState(isCollapsedByDefault)

    const onClose = () => {
        setIsCollapsed(true)
        if (onDismiss) {
            onDismiss()
        }
    }

    const hotkeysOnDone = () => {
        setIsCollapsed(true)
        if (onConfirm) {
            onConfirm()
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
            break
        case "hotkeys":
            Dialog = HotkeysDialog
            break
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
                    onDone={type === "hotkeys" ? hotkeysOnDone : onClose}
                    onClickOutside={onClose}
                    showSubHeader={showSubHeader}
                />
            )}
        </>
    )
}

export default CollapsableMessage
