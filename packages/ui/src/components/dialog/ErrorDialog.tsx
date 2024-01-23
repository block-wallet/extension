import { FunctionComponent, useEffect } from "react"
import { CgDanger } from "react-icons/cg"
import classnames from "classnames"

import MessageDialog, { messageDialogProps } from "./MessageDialog"
import Divider from "../Divider"

import { Classes } from "../../styles"
import CloseIcon from "../icons/CloseIcon"

type ErrorDialogProps = messageDialogProps & {
    onDone: React.MouseEventHandler<HTMLButtonElement> | (() => void)
    timeout?: number // If setted, it will trigger onClickButton() after timeout value
    hideButton?: boolean
    showCloseButton?: boolean
}

const ErrorDialog: FunctionComponent<ErrorDialogProps> = ({
    title,
    message,
    open,
    hideButton,
    onClickOutside,
    onDone,
    timeout,
    showCloseButton = false,
}) => {
    useEffect(() => {
        if (timeout && open) {
            const timer = setTimeout(onDone, timeout)
            return () => clearTimeout(timer)
        }
    }, [onDone, open, timeout])

    return (
        <MessageDialog
            title={title}
            message={message}
            open={open}
            onClickOutside={onClickOutside}
            header={
                <>
                    {showCloseButton && (
                        <div className="text-right -mt-2">
                            <button
                                onClick={onDone}
                                className={classnames(
                                    "p-2 -mr-2 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                                )}
                                type="button"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                    )}
                    <CgDanger className="text-red-500 w-20 h-20 block m-auto" />
                </>
            }
            footer={
                !timeout &&
                !hideButton && (
                    <>
                        <div className="-mx-6">
                            <Divider />
                        </div>

                        <button
                            className={classnames(Classes.liteButton, "mt-4")}
                            onClick={onDone}
                        >
                            OK
                        </button>
                    </>
                )
            }
        />
    )
}

export default ErrorDialog
