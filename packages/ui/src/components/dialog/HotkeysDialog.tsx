import { FunctionComponent } from "react"
import { Classes, classnames } from "../../styles"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import Divider from "../Divider"
import CloseIcon from "../icons/CloseIcon"
import Dialog from "./Dialog"

export type messageDialogProps = {
    message: React.ReactElement | string
    open: boolean
    onClickOutside?: () => void
    onDone?: () => void
    onCancel?: () => void
}

const HotkeysDialog: FunctionComponent<messageDialogProps> = ({
    message,
    open,
    onClickOutside,
    onDone,
    onCancel,
}) => {
    return (
        <>
            <Dialog
                open={open}
                onClickOutside={onClickOutside}
                className={"overflow-scroll"}
            >
                <>
                    <div className="flex mb-1">
                        <div className="mr-16">
                            <h2 className="text-lg font-bold text-start ml-5 mb-5">
                                Keyboard Shortcuts
                            </h2>
                        </div>
                        <div>
                            <button
                                onClick={onCancel}
                                className={classnames(
                                    "p-2 -mr-2 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
                                )}
                                type="button"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                    </div>
                    <h3 className="font-normal ml-5 text-sm">
                        This is current page keyboard shortcuts.
                    </h3>
                    <div className="overflow-scroll">
                        <div className={classnames("flex mt-1 mb-2")}>
                            {message}
                        </div>
                    </div>
                    <div className="flex -mb-6">
                        <Divider className="absolute bottom-16" />
                        <div className="flex w-full">
                            <ButtonWithLoading
                                label="Close"
                                buttonClass={classnames(
                                    Classes.whiteButton,
                                    "bg-white mr-2 ml-5"
                                )}
                                onClick={onCancel}
                            />
                            <ButtonWithLoading
                                label="Settings"
                                buttonClass={classnames(
                                    Classes.button,
                                    "ml-2 mr-5"
                                )}
                                onClick={onDone}
                            />
                        </div>
                    </div>
                </>
            </Dialog>
        </>
    )
}

export default HotkeysDialog
