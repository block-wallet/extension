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
    showSubHeader?: boolean
}

const HotkeysDialog: FunctionComponent<messageDialogProps> = ({
    message,
    open,
    onClickOutside,
    onDone,
    onCancel,
    showSubHeader,
}) => {
    return (
        <>
            <Dialog
                open={open}
                onClickOutside={onClickOutside}
                className={"overflow-scroll"}
            >
                <>
                    <span className="absolute top-0 right-0 p-4 z-50">
                        <div
                            onClick={onCancel}
                            className=" cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
                        >
                            <CloseIcon size="10" />
                        </div>
                    </span>
                    <div className="flex flex-col w-full space-y-2">
                        <div className="z-10 flex flex-row items-center p-4 bg-white bg-opacity-75">
                            <h2 className="text-lg font-bold">
                                Keyboard Shortcuts
                            </h2>
                        </div>
                    </div>
                    {showSubHeader && (
                        <h3 className="font-normal px-4 text-sm">
                            Shortcuts for current screen.
                        </h3>
                    )}
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
