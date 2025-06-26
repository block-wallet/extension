import classnames from "classnames"
import { FunctionComponent, useEffect, useMemo, useState } from "react"
import { Classes } from "../../styles"
import CloseIcon from "../icons/CloseIcon"
import Dialog from "./Dialog"

// Icons
import { HiExclamationCircle, HiInformationCircle, HiX, HiClock } from "react-icons/hi"

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
    variant?: 'info' | 'warning' | 'danger' // visual variant for the dialog
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
    variant = 'info',
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

        // Get variant styling
        const variantConfig = useMemo(() => {
            switch (variant) {
                case 'warning':
                    return {
                        icon: HiExclamationCircle,
                        iconBg: 'bg-amber-50 dark:bg-amber-900/20',
                        iconBorder: 'border-amber-200 dark:border-amber-800',
                        iconColor: 'text-amber-600 dark:text-amber-400',
                        confirmButton: 'bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-600 border-amber-600 dark:border-amber-500',
                    }
                case 'danger':
                    return {
                        icon: HiExclamationCircle,
                        iconBg: 'bg-red-50 dark:bg-red-900/20',
                        iconBorder: 'border-red-200 dark:border-red-800',
                        iconColor: 'text-red-600 dark:text-red-400',
                        confirmButton: 'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 border-red-600 dark:border-red-500',
                    }
                default:
                    return {
                        icon: HiInformationCircle,
                        iconBg: 'bg-blue-50 dark:bg-blue-900/20',
                        iconBorder: 'border-blue-200 dark:border-blue-800',
                        iconColor: 'text-blue-600 dark:text-blue-400',
                        confirmButton: 'bg-primary-blue-default dark:bg-primary-blue-400 hover:bg-primary-blue-600 dark:hover:bg-primary-blue-500 border-primary-blue-default dark:border-primary-blue-400',
                    }
            }
        }, [variant])

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

        const IconComponent = variantConfig.icon

        return (
            <Dialog open={open} onClickOutside={onClose} className="px-6">
                <div className="relative">
                    {/* Close Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onClose()
                        }}
                        className="absolute -top-2 -right-2 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label="Close dialog"
                    >
                        <HiX className="w-5 h-5" />
                    </button>

                    {/* Header with Icon */}
                    <div className="flex items-start space-x-4 mb-4">
                        <div className={classnames(
                            "w-10 h-10 rounded-full flex items-center justify-center border flex-shrink-0",
                            variantConfig.iconBg,
                            variantConfig.iconBorder
                        )}>
                            <IconComponent className={classnames("w-5 h-5", variantConfig.iconColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                {title}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>

                    {/* Timer Display */}
                    {isButtonDisabled && confirmDisabledUntil && secondsRemaining > 0 && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                <HiClock className="w-4 h-4" />
                                <span>
                                    Available in <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{refreshTimerText}</span>
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-3 space-y-reverse sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            className={classnames(
                                "px-4 py-2 text-sm font-medium rounded-lg transition-colors border",
                                "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600",
                                "hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500",
                                "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
                            )}
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
                                "px-4 py-2 text-sm font-medium rounded-lg transition-colors border text-white",
                                "focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800",
                                isButtonDisabled
                                    ? "bg-gray-400 dark:bg-gray-600 border-gray-400 dark:border-gray-600 cursor-not-allowed opacity-50"
                                    : variantConfig.confirmButton
                            )}
                            disabled={isButtonDisabled}
                        >
                            <div className="flex items-center space-x-2">
                                {isButtonDisabled && refreshTimerText ? (
                                    <>
                                        <HiClock className="w-4 h-4" />
                                        <span>{refreshTimerText}</span>
                                    </>
                                ) : (
                                    <span>{confirmText}</span>
                                )}
                            </div>
                        </button>
                    </div>
                </div>
            </Dialog>
        )
    }

export default ConfirmDialog
