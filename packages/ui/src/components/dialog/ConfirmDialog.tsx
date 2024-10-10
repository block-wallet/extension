import classnames from "classnames"
import { FunctionComponent, useEffect, useMemo, useState } from "react"
import { Classes } from "../../styles"
import CloseIcon from "../icons/CloseIcon"
import Dialog from "./Dialog"

export interface ConfirmDialogState {
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
    open: boolean
    onConfirm?: () => void
    onClose?: () => void
}

const ConfirmDialog: FunctionComponent<{
    title: string
    message: string
    open: boolean
    onClose: () => void
    onConfirm: () => void
    isConfirmDisabled?: boolean // if true, confirm button is disabled
    confirmDisabledUntil?: Date // if set, confirm button is disabled until this time (no need to use isConfirmDisabled in this case)
    confirmText?: string
    cancelText?: string
}> = ({
    title,
    message,
    open,
    onClose,
    onConfirm,
    isConfirmDisabled = false,
    confirmDisabledUntil,
    confirmText = "Confirm",
    cancelText = "Cancel",
}) => {
    const [secondsRemaining, setSecondsRemaining] = useState(0)

    const isButtonDisabled = useMemo(() => {
        return isConfirmDisabled || secondsRemaining > 0
    }, [isConfirmDisabled, secondsRemaining])

    const refreshTimerText = useMemo(() => {
        return `${(Math.floor(secondsRemaining / 60) % 60)
            .toString()
            .padStart(2, "0")}:${(secondsRemaining % 60)
            .toString()
            .padStart(2, "0")}`
    }, [secondsRemaining])

    useEffect(() => {
        // if confirm is disabled and confirmDisabledUntil is defined , start a timer to update the seconds remaining
        if (!isButtonDisabled || !confirmDisabledUntil) return
        const intervalId = setInterval(() => {
            setSecondsRemaining(secondsRemaining - 1)
        }, 1000)
        // clear the interval when the component unmounts
        return () => clearInterval(intervalId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [secondsRemaining])

    useEffect(() => {
        if (!confirmDisabledUntil) return
        setSecondsRemaining(
            Math.ceil((confirmDisabledUntil.getTime() - Date.now()) / 1000)
        )
    }, [confirmDisabledUntil])

    return (
        <Dialog open={open} onClickOutside={onClose} className="px-6">
            <div>
                <h2 className="text-lg font-semibold text-primary-black-default text-left">
                    {title}
                </h2>
                <div className="py-5 text-left">
                    <span className="text-sm">{message}</span>
                </div>
                <span className="absolute top-0 right-0 p-4">
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            onClose()
                        }}
                        className="cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                    >
                        <CloseIcon size="10" />
                    </div>
                </span>
                <div className="">
                    <hr className="absolute left-0 border-0.5 border-primary-grey-hover w-full" />
                    <div className="flex flex-row w-full items-center pt-5 justify-between space-x-4 mt-auto">
                        <button
                            className={classnames(Classes.liteButton)}
                            onClick={(e) => {
                                e.stopPropagation()
                                onClose()
                            }}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={(e) => {
                                if (isButtonDisabled) return
                                e.stopPropagation()
                                onConfirm()
                                onClose()
                            }}
                            className={classnames(
                                Classes.button,
                                isButtonDisabled &&
                                    "bg-primary-black-default border-primary-black-default opacity-50"
                            )}
                            disabled={isButtonDisabled}
                        >
                            {isButtonDisabled && refreshTimerText
                                ? refreshTimerText
                                : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </Dialog>
    )
}

export default ConfirmDialog
