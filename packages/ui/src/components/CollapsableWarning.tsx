import React from "react"
import WarningDialog from "./dialog/WarningDialog"

interface CollapsableWarningProps {
    isCollapsedByDefault: boolean
    onDismiss: () => void
    dialog: {
        title: string
        message: JSX.Element
    }
    collapsedMessage: JSX.Element | string
}
const CollapsableWarning = ({
    isCollapsedByDefault,
    onDismiss,
    dialog,
    collapsedMessage,
}: CollapsableWarningProps) => {
    const [isCollapsed, setIsCollapsed] = React.useState(isCollapsedByDefault)

    if (isCollapsed) {
        return (
            <div
                onClick={() => setIsCollapsed(false)}
                className="cursor-pointer"
            >
                {collapsedMessage}
            </div>
        )
    }

    const onClose = () => {
        setIsCollapsed(true)
        onDismiss()
    }

    return (
        <WarningDialog
            open={true}
            title={dialog.title}
            message={dialog.message}
            buttonLabel="OK"
            onCancel={onClose}
            onDone={onClose}
        />
    )
}

export default CollapsableWarning
