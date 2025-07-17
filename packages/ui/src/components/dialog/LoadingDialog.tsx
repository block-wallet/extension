import MessageDialog from "./MessageDialog"

export type loadingDialogProps = {
    open: boolean
    title: React.ReactElement | string
    message: React.ReactElement | string
    customSpinner?: React.ReactNode
}

const LoadingDialog = ({
    open,
    title,
    message,
    customSpinner,
}: loadingDialogProps) => {
    return (
        <MessageDialog
            open={open}
            onClickOutside={() => { }}
            title={title}
            message={message}
            header={
                <>
                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            {customSpinner ? (
                                customSpinner
                            ) : (
                                <>
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center shadow-lg border border-blue-200/50 dark:border-blue-700/50">
                                        <div className="relative">
                                            <div className="w-10 h-10 border-3 border-blue-200 dark:border-blue-700 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-transparent dark:from-blue-300/20 animate-spin"></div>
                                </>
                            )}
                        </div>
                    </div>
                </>
            }
        />
    )
}

export default LoadingDialog
