import { FC, PropsWithChildren } from "react"
import classnames from "classnames"
interface OutlinedButtonProps {
    onClick?: (e: any) => void
    className?: string
    disabled?: boolean
    title?: string
}
const OutlinedButton: FC<PropsWithChildren<OutlinedButtonProps>> = ({
    onClick,
    className = "",
    children,
    disabled = false,
    title,
}) => {
    return (
        <button
            className={classnames(
                "flex flex-row items-center bg-white border border-[#D7D9D7] hover:border-primary-black-default justify-between",
                "h-10 rounded-lg text-sm font-semibold text-black w-10 p-2.5",
                onClick && "cursor-pointer",
                className
            )}
            onClick={onClick}
            disabled={disabled}
            {...(title ? { title: title } : {})}
        >
            {children}
        </button>
    )
}
export default OutlinedButton
