import { FunctionComponent, useEffect } from "react"
import { useBlankState } from "../../context/background/backgroundHooks"
import { generateExplorerLink, getExplorerTitle } from "../../util/getExplorer"
import Divider from "../Divider"
import classnames from "classnames"
import MessageDialog, { messageDialogProps } from "./MessageDialog"
import CloseIcon from "../icons/CloseIcon"

const SuccessDialog: FunctionComponent<
    messageDialogProps & {
        open: boolean
        title: React.ReactElement | string
        message: React.ReactElement | string
        hideButton?: boolean
        timeout?: number
        txHash?: string
        onDone: () => void
        showCloseButton?: boolean
    }
> = ({
    open,
    title,
    message,
    timeout,
    txHash,
    hideButton,
    onDone,
    onClickOutside,
    showCloseButton = false,
}) => {
        const { selectedNetwork, availableNetworks } = useBlankState()!

        const explorerName = getExplorerTitle(availableNetworks, selectedNetwork)

        useEffect(() => {
            if (timeout && open) {
                const timer = setTimeout(() => onDone(), timeout)
                return () => clearTimeout(timer)
            }
        }, [onDone, open, timeout])

        return (
            <MessageDialog
                title={title}
                message={message}
                open={open}
                onClickOutside={onClickOutside || onDone}
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
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 dark:from-green-500 dark:to-green-700 flex items-center justify-center shadow-lg">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>

                                <div className="absolute inset-0 rounded-full bg-green-500/20 dark:bg-green-400/20 animate-ping"></div>
                            </div>
                        </div>
                    </>
                }
                footer={
                    <>
                        {txHash && (
                            <div className="flex w-full items-center justify-center -mt-2 mb-6">
                                <a
                                    href={generateExplorerLink(
                                        availableNetworks,
                                        selectedNetwork,
                                        txHash,
                                        "tx"
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex flex-row items-center space-x-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-all duration-200 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    <span>View on {explorerName}</span>
                                </a>
                            </div>
                        )}

                        {!timeout && !hideButton && (
                            <>
                                <div className="-mx-6">
                                    <Divider />
                                </div>
                                <div className="mt-4">
                                    <button
                                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 dark:from-green-500 dark:to-green-600 dark:hover:from-green-600 dark:hover:to-green-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                                        onClick={onDone}
                                    >
                                        Continue
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                }
            />
        )
    }

export default SuccessDialog
