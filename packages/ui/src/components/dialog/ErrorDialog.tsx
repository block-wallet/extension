import { FunctionComponent, useEffect } from "react"
import classnames from "classnames"

import MessageDialog, { messageDialogProps } from "./MessageDialog"
import Divider from "../Divider"

import CloseIcon from "../icons/CloseIcon"

type ErrorDialogProps = messageDialogProps & {
    onDone: React.MouseEventHandler<HTMLButtonElement> | (() => void)
    timeout?: number
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
                                    "p-2 -mr-2 transition duration-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                )}
                                type="button"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                    )}

                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 dark:from-red-500 dark:to-red-700 flex items-center justify-center shadow-lg">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>

                            <div className="absolute inset-0 rounded-full bg-red-500/10 dark:bg-red-400/10 blur-lg"></div>
                        </div>
                    </div>
                </>
            }
            footer={
                !timeout &&
                !hideButton && (
                    <>
                        <div className="-mx-6">
                            <Divider />
                        </div>
                        <div className="mt-4">
                            <button
                                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 dark:from-red-500 dark:to-red-600 dark:hover:from-red-600 dark:hover:to-red-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                                onClick={onDone}
                            >
                                Try Again
                            </button>
                        </div>
                    </>
                )
            }
        />
    )
}

export default ErrorDialog
