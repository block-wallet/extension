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
    onDone?: () => void
    buttonLabel?: string
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
    onDone,
    buttonLabel,
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

                <div className="text-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                        {title}
                    </h2>
                </div>

                <div className={classnames(
                    "mb-6 text-center",
                    wideMargins ? "px-2" : "px-1"
                )}>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
                        {message}
                    </p>
                </div>

                {buttonLabel && (
                    <div className="w-full">
                        <button
                            className={classnames(
                                "w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]",
                                fullScreen && "mx-4"
                            )}
                            onClick={onDone}
                        >
                            {buttonLabel}
                        </button>
                    </div>
                )}

                {footer}
            </>
        </DialogComponent>
    )
}

export default MessageDialog
