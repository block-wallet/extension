import { FC, PropsWithChildren } from "react"
import classnames from "classnames"
interface OutlinedButtonProps {
    onClick?: (e: any) => void
    className?: string
}
const OutlinedButton: FC<PropsWithChildren<OutlinedButtonProps>> = ({
    onClick,
    className = "",
    children,
}) => {
    return (
        <button
            className={classnames(
                "flex flex-row items-center bg-white border border-gray-200 hover:border-black justify-between",
                "h-12 space-x-2 p-4 rounded-md text-sm font-bold text-black w-full",
                onClick && "cursor-pointer",
                className
            )}
            onClick={onClick}
        >
            {children}
        </button>
    )
}
export default OutlinedButton
