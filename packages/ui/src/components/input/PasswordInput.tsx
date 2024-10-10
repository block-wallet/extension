import { Suspense, forwardRef, lazy, useState } from "react"

import { BsCapslockFill } from "react-icons/bs"
import CapsLockDetector from "./CapsLockDetector"

// Style
import { Classes } from "../../styles/classes"
import classNames from "classnames"

// Assets
import EyeCloseIcon from "../icons/EyeCloseIcon"
import EyeOpenIcon from "../icons/EyeOpenIcon"

// Types
type PasswordInputProps = {
    label?: string
    placeholder?: string
    name?: string
    error?: string
    autoFocus?: boolean
    autoComplete?: string
    strengthBar?: boolean
    value?: string
    onChange?: (value: any) => void
    onPaste?: (value: any) => void
    setPasswordScore?: (value: number) => void
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
}

/**
 * TextInput:
 * Creates a password input with a visible / hidden status.
 *
 * @param label - Display label above input.
 * @param placeholder - Placeholder for the input.
 * @param name - Name of the input, for yup validation.
 * @param register - Yup reference.
 * @param error - Yup error or message to display as red error under input.
 * @param autoFocus - Auto focus input when entering page if true.
 * @param autoComplete - Enable browser autocomplete suggestions if true.
 * @param strengthBar - Show the strength of the input password.
 * @param value - Write a value in the input from the outside.
 * @param onChange - Function to execute on input change.
 * @param onPaste - Function to execute on input paste.
 * @param setPasswordScore - Function to execute on password score change (if it has strengthBar).
 * @param onKeyDown - Function to execute on key down.
 */
const PasswordStrengthBar = lazy(() => import("react-password-strength-bar"))
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    (props: PasswordInputProps, ref) => {
        const {
            label,
            placeholder,
            name = "password",
            error = "",
            autoFocus,
            autoComplete,
            strengthBar,
            value = "",
            onChange,
            onPaste,
            setPasswordScore,
            onKeyDown,
        } = props

        // State
        const [passwordValue, setPasswordValue] = useState<string>("")
        const [showPassword, setShowPassword] = useState<boolean>(false)
        const [showStrengthBar, setShowStrengthBar] = useState<boolean>(false)

        // Handlers
        const handlePasswordChange = (e: any) => {
            setPasswordValue(e.target.value)
            if (strengthBar) setShowStrengthBar(e.target.value.length > 0)
            if (onChange) onChange(e)
        }

        return (
            <CapsLockDetector>
                {({ isCapsLock }) => (
                    <>
                        {/* LABEL */}
                        {label ? (
                            <label
                                htmlFor={name}
                                className={Classes.inputLabel}
                            >
                                {label}
                            </label>
                        ) : null}

                        {/* INPUT */}
                        <div className="flex items-center flex-row relative">
                            <input
                                name={name}
                                type={showPassword ? "text" : "password"}
                                id={name}
                                ref={ref}
                                className={classNames(
                                    Classes.input,
                                    "w-full",
                                    error !== ""
                                        ? "border-red-400 focus:border-red-400"
                                        : ""
                                )}
                                value={value || passwordValue}
                                placeholder={placeholder ? placeholder : ""}
                                autoComplete={
                                    autoComplete ? autoComplete : "off"
                                }
                                autoFocus={autoFocus ? autoFocus : false}
                                onChange={(e) => handlePasswordChange(e)}
                                onPaste={onPaste}
                                onKeyDown={onKeyDown}
                            />
                            <div
                                className={classNames(
                                    "w-6 h-6 p-1 mt-2 mr-3 absolute right-0 transition-all duration-300 cursor-pointer hover:bg-primary-grey-default hover:text-primary-blue-default text-primary-grey-dark rounded-full",
                                    showPassword === false
                                        ? "opacity-100 z-10"
                                        : "opacity-0 pointer-event-none z-0"
                                )}
                                onClick={() => setShowPassword(true)}
                            >
                                <EyeCloseIcon />
                            </div>
                            <div
                                className={classNames(
                                    "w-6 h-6 p-1 mt-2 mr-3 absolute right-0 transition-all duration-300 cursor-pointer hover:bg-primary-grey-default  hover:text-primary-blue-default text-primary-grey-dark rounded-full flex items-center",
                                    showPassword === true
                                        ? "opacity-100 z-10"
                                        : "opacity-0 pointer-event-none z-0"
                                )}
                                onClick={() => setShowPassword(false)}
                            >
                                <EyeOpenIcon />
                            </div>
                            {isCapsLock && (
                                <BsCapslockFill
                                    className="w-4 h-4 absolute right-6"
                                    color="#8093AB"
                                />
                            )}
                        </div>

                        {/* STRENGTH */}
                        {strengthBar ? (
                            <Suspense fallback={<div className="h-7"></div>}>
                                <PasswordStrengthBar
                                    password={passwordValue}
                                    className={classNames(
                                        "m-0",
                                        showStrengthBar ? "" : "hidden"
                                    )}
                                    onChangeScore={(s) => {
                                        if (setPasswordScore) {
                                            setPasswordScore(s)
                                        }
                                    }}
                                />
                            </Suspense>
                        ) : null}

                        {/* ERROR */}
                        <span
                            className={classNames(
                                "text-xs text-red-500",
                                error === ""
                                    ? "m-0 h-0"
                                    : showStrengthBar && "block -mt-5 w-5/6"
                            )}
                        >
                            {error || ""}
                        </span>
                    </>
                )}
            </CapsLockDetector>
        )
    }
)

export default PasswordInput
