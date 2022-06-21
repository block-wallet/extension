import classnames from "classnames"
import React, { FunctionComponent, useEffect, useState } from "react"

const ToggleButton: FunctionComponent<{
    register?: any
    //inidicate the ID if you have more than one toggle input in the same screen to avoid collisions
    id?: string
    label?: string
    inputName?: string
    disabled?: boolean
    defaultChecked: boolean
    onToggle: (checked: boolean) => void
}> = ({
    register,
    label,
    inputName,
    disabled = false,
    defaultChecked,
    onToggle,
    id = "toggleInput",
}) => {
    const [isChecked, setIsCheked] = useState(defaultChecked)

    useEffect(() => {
        onToggle(isChecked)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isChecked])

    useEffect(() => {
        setIsCheked(defaultChecked)
    }, [defaultChecked])

    const backgroundStyle = disabled
        ? "bg-gray-200"
        : isChecked
        ? "bg-primary-300"
        : "bg-primary-200"

    return (
        <label
            htmlFor={id}
            className={classnames(
                "flex items-center justify-between w-full",
                !disabled && "cursor-pointer"
            )}
        >
            {label && <div className="font-bold text-sm">{label}</div>}
            <div className="group relative">
                <div
                    className={classnames(
                        "block w-11 h-6 rounded-full",
                        backgroundStyle
                    )}
                ></div>
                <div
                    className={classnames(
                        "dot absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition transform",
                        isChecked && "translate-x-full"
                    )}
                ></div>
                <input
                    type="checkbox"
                    ref={register}
                    id={id}
                    name={inputName ?? "toggleInput"}
                    className="sr-only"
                    disabled={disabled}
                    onClick={() => {
                        setIsCheked(!isChecked)
                    }}
                />
            </div>
        </label>
    )
}

export default ToggleButton
