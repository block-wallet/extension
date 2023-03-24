import { FunctionComponent } from "react"

export const ButtonWithIcon: FunctionComponent<{
    onClick?: React.MouseEventHandler<HTMLButtonElement>
    disabled?: boolean
    disableStyles?: boolean
    icon?: string
    label: string
    to?: string
}> = ({ disableStyles, disabled, onClick, icon, label, to }) => {
    const className = "flex flex-row space-x-3 items-center text-gray-900"
    const children = (
        <>
            {icon && <img src={icon} alt="icon" className="w-5 h-5" />}
            <span className="font-semibold">{label}</span>
        </>
    )

    return (
        <button
            type="button"
            disabled={disabled}
            className={
                !disableStyles
                    ? `flex flex-row items-center justify-between p-4 rounded-md text-sm transform transition-all duration-300 active:scale-95
                 disabled:pointer-events-none bg-primary-grey-default hover:bg-primary-grey-hover
                ${disabled ? "pointer-events-none" : ""}
              `
                    : ""
            }
            onClick={onClick}
        >
            {to?.includes("https://") ? (
                <a
                    className={className}
                    href={to}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {children}
                </a>
            ) : (
                <div className={className}>{children}</div>
            )}
        </button>
    )
}
