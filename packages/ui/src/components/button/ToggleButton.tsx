import classnames from "classnames"
import { FunctionComponent, useEffect, useState } from "react"

const ToggleButton: FunctionComponent<{
    //inidicate the ID if you have more than one toggle input in the same screen to avoid collisions
    id?: string
    label?: string
    inputName?: string
    disabled?: boolean
    readOnly?: boolean
    defaultChecked: boolean
    onToggle?: (checked: boolean) => void
}> = ({
    label,
    inputName,
    disabled = false,
    defaultChecked,
    readOnly,
    onToggle,
    id = "toggleInput",
}) => {
    const [isChecked, setIsCheked] = useState(defaultChecked)

    useEffect(() => {
        if (onToggle) {
            onToggle(isChecked)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isChecked])

    useEffect(() => {
        setIsCheked(defaultChecked)
    }, [defaultChecked])

    const backgroundStyle = disabled
        ? "bg-gray-200"
        : isChecked
        ? "bg-primary-blue-default"
        : "bg-primary-200"

    const onClick = () => {
        if (!disabled && !readOnly) {
            setIsCheked(!isChecked)
        }
    }
    return (
        <label
            htmlFor={id}
            className={classnames(
                "flex items-center justify-between w-full",
                !disabled && !readOnly && "cursor-pointer"
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
                    id={id}
                    name={inputName ?? "toggleInput"}
                    className="sr-only"
                    disabled={disabled}
                    readOnly={readOnly}
                    onClick={onClick}
                />
            </div>
        </label>
    )
}

export default ToggleButton
