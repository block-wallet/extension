import classnames from "classnames"
import { FunctionComponent } from "react"
import { Classes } from "../../styles"
import CloseIcon from "../icons/CloseIcon"
import Dialog from "./Dialog"

const ConfirmDialog: FunctionComponent<{
    title: string
    message: string
    open: boolean
    onClose: () => void
    onConfirm: () => void
}> = ({ title, message, open, onClose, onConfirm }) => {
    return (
        <Dialog open={open} onClickOutside={onClose} className="px-6">
            <div>
                <h2 className="text-lg font-bold text-black text-left">
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
                        className="cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
                    >
                        <CloseIcon size="10" />
                    </div>
                </span>
                <div className="">
                    <hr className="absolute left-0 border-0.5 border-gray-200 w-full" />
                    <div className="flex flex-row w-full items-center pt-5 justify-between space-x-4 mt-auto">
                        <button
                            className={classnames(Classes.liteButton)}
                            onClick={(e) => {
                                e.stopPropagation()
                                onClose()
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onConfirm()
                                onClose()
                            }}
                            className={classnames(Classes.button)}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </Dialog>
    )
}

export default ConfirmDialog
