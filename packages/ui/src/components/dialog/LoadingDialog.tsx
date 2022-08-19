import MessageDialog from "./MessageDialog"
import Spinner from "../spinner/ThinSpinner"

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
            onClickOutside={() => {}}
            title={title}
            message={message}
            header={
                <>
                    {customSpinner ? (
                        customSpinner
                    ) : (
                        <div className="flex justify-center items-center">
                            <Spinner size="48px" />
                        </div>
                    )}
                </>
            }
        />
    )
}

export default LoadingDialog
