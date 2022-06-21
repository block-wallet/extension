import classnames from "classnames"
import React, { FunctionComponent, useRef, useState } from "react"
import { Classes } from "../../styles"
import { useOnClickOutside } from "../../util/useOnClickOutside"
import CloseIcon from "../icons/CloseIcon"
import Dialog from "./Dialog"

const CheckBoxDialog: FunctionComponent<{
    title: string
    message: string
    open: boolean
    showCheckbox?: boolean
    checkboxText?: string
    closeText?: string
    confirmText?: string
    showCloseButton?: boolean
    onClose: () => void
    onCancel?: () => void
    onConfirm: (option?: boolean) => void
}> = ({
    title,
    message,
    open,
    showCheckbox = false,
    checkboxText = "",
    closeText = "Cancel",
    showCloseButton = true,
    confirmText = "Confirm",
    onClose,
    onCancel,
    onConfirm,
}) => {
    const [checked, setChecked] = useState(false)
    const ref = useRef(null)
    useOnClickOutside(ref, () => onClose())

    return (
        <Dialog open={open} onClickOutside={onClose}>
            <div className="px-3">
                <h2 className="text-lg font-bold">{title}</h2>
                <div className="py-5">
                    <span className="text-sm whitespace-pre-line">
                        {message}
                    </span>
                    {showCheckbox && (
                        <div className="pt-4 flex flex-row items-center">
                            <input
                                type="checkbox"
                                className={Classes.checkbox}
                                onChange={() => {
                                    setChecked(!checked)
                                }}
                                id="checkbox"
                            />
                            <label htmlFor="checkbox" className="text-xs pl-2">
                                {checkboxText}
                            </label>
                        </div>
                    )}
                </div>
                <span className="absolute top-0 right-0 p-4">
                    <div
                        onClick={() => onClose()}
                        className=" cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
                    >
                        <CloseIcon size="10" />
                    </div>
                </span>
                <div className="">
                    <hr className="absolute left-0 border-0.5 border-gray-200 w-full" />
                    <div className="flex flex-row w-full items-center pt-5 justify-between space-x-4 mt-auto">
                        {showCloseButton && (
                            <button
                                className={classnames(Classes.liteButton)}
                                onClick={() => {
                                    onCancel && onCancel()
                                    onClose()
                                }}
                            >
                                {closeText}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                onConfirm(checked)
                                onClose()
                            }}
                            className={classnames(Classes.button)}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </Dialog>
    )
}

export default CheckBoxDialog
