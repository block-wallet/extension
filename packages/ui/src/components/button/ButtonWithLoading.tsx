import { FunctionComponent } from "react"
import { Classes, classnames } from "../../styles"
import Spinner from "../spinner/Spinner"

export const ButtonWithLoading: FunctionComponent<{
    type?: "submit" | "reset" | "button"
    onClick?: React.MouseEventHandler<HTMLButtonElement>
    isLoading?: boolean
    disabled?: boolean
    label: string
    to?: string
    buttonClass?: string
    formId?: string
    spinnerSize?: string
}> = ({
    type,
    onClick,
    isLoading,
    disabled,
    label,
    to,
    buttonClass,
    formId = undefined,
    spinnerSize = "24",
}) => {
    const children = (
        <>
            {!isLoading ? (
                label
            ) : (
                <Spinner
                    color={buttonClass ? "black" : "white"}
                    size={spinnerSize || "24"}
                />
            )}
        </>
    )

    return (
        <button
            type={type}
            disabled={disabled || isLoading}
            className={classnames(
                buttonClass || Classes.darkButton,
                "w-full",
                (isLoading || disabled) && "opacity-50 pointer-events-none"
            )}
            onClick={onClick}
            {...(formId ? { form: formId } : {})}
        >
            {to?.includes("https://") ? (
                <a
                    className="flex flex-row space-x-3 items-center text-gray-900"
                    href={to}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {children}
                </a>
            ) : (
                children
            )}
        </button>
    )
}
