import classnames from "classnames"
import React, { FunctionComponent } from "react"
import { AiOutlineWarning } from "react-icons/ai"
import { Classes } from "../../styles"
import Divider from "../Divider"
import MessageDialog from "./MessageDialog"

const WarningDialog: FunctionComponent<{
    open: boolean
    title: string
    message: React.ReactElement | string
    onDone: () => void
    buttonLabel?: string
    iconColor?: string
    useClickOutside?: boolean
    wideMargins?: boolean
    fullScreen?: boolean
    cancelButton?: boolean
    onCancel?: () => void
}> = ({
    open,
    title,
    message,
    onDone,
    buttonLabel = "OK",
    iconColor = "text-yellow-500",
    useClickOutside = true,
    wideMargins = true,
    fullScreen = false,
    cancelButton = false,
    onCancel,
}) => {
    return (
        <MessageDialog
            header={
                <AiOutlineWarning
                    className={classnames(
                        "w-16 h-16 mb-2 block m-auto",
                        iconColor
                    )}
                />
            }
            footer={
                <>
                    <div
                        className={
                            !fullScreen ? (wideMargins ? "-mx-6" : "-mx-3") : ""
                        }
                    >
                        <Divider />
                    </div>
                    <div className="p-1 w-full flex">
                        {cancelButton && onCancel && (
                            <button
                                className={classnames(
                                    Classes.liteButton,
                                    "w-3/6 mt-4",
                                    fullScreen && "mx-4"
                                )}
                                onClick={onCancel}
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            className={classnames(
                                Classes.liteButton,
                                "mt-4",
                                fullScreen && "mx-4",
                                cancelButton && onCancel && "w-3/6"
                            )}
                            onClick={onDone}
                        >
                            {buttonLabel}
                        </button>
                    </div>
                </>
            }
            onClickOutside={useClickOutside ? onDone : undefined}
            title={title}
            message={message}
            open={open}
            wideMargins={wideMargins}
            fullScreen={fullScreen}
        />
    )
}

export default WarningDialog
