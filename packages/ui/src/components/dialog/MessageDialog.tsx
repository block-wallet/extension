import { FunctionComponent } from "react"
import { classnames } from "../../styles"
import Dialog from "./Dialog"
import FullScreenDialog from "./FullScreenDialog"

export type messageDialogProps = {
    title: React.ReactElement | string
    message: React.ReactElement | string
    open: boolean
    header?: React.ReactNode
    footer?: React.ReactNode
    onClickOutside?: () => void
    fullScreen?: boolean
    wideMargins?: boolean
}

const MessageDialog: FunctionComponent<messageDialogProps> = ({
    title,
    message,
    open,
    header,
    footer,
    onClickOutside,
    wideMargins = true,
    fullScreen = false,
}) => {
    const DialogComponent = fullScreen ? FullScreenDialog : Dialog
    return (
        <DialogComponent
            open={open}
            onClickOutside={onClickOutside}
            className={wideMargins ? "px-6" : "px-3"}
        >
            <>
                {header}
                <h2 className="text-lg font-bold text-center mt-4">{title}</h2>
                <div
                    className={classnames(
                        "flex mt-2 mb-4",
                        wideMargins ? "px-5 " : "px-1"
                    )}
                >
                    <span className="text-sm text-center w-full text-gray-500">
                        {message}
                    </span>
                </div>
                {footer}
            </>
        </DialogComponent>
    )
}

export default MessageDialog
