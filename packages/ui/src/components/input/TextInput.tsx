import { forwardRef, useState, HTMLInputTypeAttribute } from "react"

import EndLabel from "./EndLabel"
// Style
import { Classes, classnames } from "../../styles/classes"
import classNames from "classnames"
import { AiFillInfoCircle } from "react-icons/ai"
import Tooltip from "../label/Tooltip"

// Types
type TextInputProps = {
    appearance: "outline" | "blue-section" | "border"
    label?: string
    placeholder?: string
    value?: string
    defaultValue?: string | number
    name?: string
    error?: string
    warning?: string
    disabled?: boolean
    autoFocus?: boolean
    autoComplete?: boolean
    maxLength?: number
    onChange?: (value: any) => void
    onKeyDown?: (value: React.KeyboardEvent<HTMLInputElement>) => void
    readOnly?: boolean
    endLabel?: string | JSX.Element
    className?: string
    type?: HTMLInputTypeAttribute
    info?: string | JSX.Element
    onClickInfo?: () => void
    spellCheck?: boolean
}

/**
 * TextInput:
 * Creates a text input.
 *
 * @param label - Display label above input.
 * @param placeholder - Placeholder for the input.
 * @param value - Value to make controlled input.
 * @param defaultValue - Default value for the input.
 * @param name - Name of the input, for yup validation.
 * @param register - Yup reference.
 * @param error - Yup error or message to display as red error under input.
 * @param warning - Warning orange message to display under input.
 * @param disabled - Disabling input if true.
 * @param autoFocus - Auto focus input when entering page if true.
 * @param autoComplete - Enable browser autocomplete suggestions if true.
 * @param maxLength - Limit size of the input value.
 * @param onChange - Function to execute on input change.
 * @param onKeyDown - Function to execute on input key down.
 * @param readOnly - readOnly attribute
 * @param spellCheck - spellCheck attribute
 */
const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
    (props: TextInputProps, ref) => {
        const {
            appearance,
            label,
            placeholder,
            value,
            defaultValue,
            name,
            error = "",
            warning = "",
            autoFocus,
            autoComplete,
            maxLength,
            disabled,
            onChange,
            onKeyDown,
            endLabel,
            readOnly = false,
            className,
            type,
            info,
            onClickInfo,
            spellCheck = true,
        } = props

        const [hasFocus, setHasFocus] = useState(autoFocus)

        const input = (
            <input
                name={name}
                type={type || "text"}
                id={name}
                value={value}
                defaultValue={defaultValue}
                ref={ref}
                className={classNames(
                    appearance === "outline"
                        ? Classes.input
                        : appearance === "border"
                        ? Classes.inputBorder
                        : Classes.blueSectionInput,
                    error !== "" ? "border-red-400 focus:border-red-400" : "",
                    warning !== ""
                        ? "border-yellow-400 focus:border-yellow-400"
                        : "",
                    readOnly || disabled ? "cursor-not-allowed" : "",
                    !endLabel ? "" : "!mt-0 items-center",
                    className
                )}
                placeholder={placeholder ? placeholder : ""}
                autoFocus={autoFocus ? autoFocus : false}
                autoComplete={autoComplete ? "on" : "off"}
                maxLength={maxLength ? maxLength : -1}
                disabled={disabled ? disabled : false}
                onChange={onChange}
                readOnly={readOnly}
                onKeyDown={onKeyDown}
                onFocus={() => setHasFocus(true)}
                onBlur={() => {
                    setHasFocus(false)
                }}
                spellCheck={spellCheck}
            />
        )

        return (
            <div
                className={classnames(
                    appearance === "blue-section" && Classes.greySection,
                    appearance === "blue-section" &&
                        hasFocus &&
                        Classes.blueSectionActive
                )}
            >
                {/* LABEL */}
                {label ? (
                    <div className="flex space-x-2 items-center">
                        <label
                            htmlFor={name}
                            className={classnames(
                                Classes.inputLabel,
                                "flex flex-row items-center space-x-2 pointer-events-none"
                            )}
                        >
                            <span>{label}</span>
                        </label>
                        {info && (
                            <div className="group relative">
                                <AiFillInfoCircle
                                    size={16}
                                    onClick={onClickInfo}
                                    className={classnames(
                                        "text-primary-grey-dark hover:text-primary-blue-default cursor-default",
                                        onClickInfo && "!cursor-pointer"
                                    )}
                                />
                                <Tooltip
                                    className="!w-60 !break-word !whitespace-normal !-translate-y-6 translate-x-1"
                                    content={info}
                                />
                            </div>
                        )}
                    </div>
                ) : null}

                {/* INPUT */}
                {!endLabel ? (
                    input
                ) : (
                    <EndLabel label={endLabel}>{input}</EndLabel>
                )}

                {/* ERROR */}
                <span
                    className={classNames(
                        "text-xs text-ellipsis overflow-hidden",
                        error !== "" ? "text-red-500" : "",
                        warning !== "" ? "text-yellow-500" : "",
                        error === "" && warning === "" ? "m-0 h-0" : ""
                    )}
                >
                    {error || warning || ""}
                </span>
            </div>
        )
    }
)

export default TextInput
