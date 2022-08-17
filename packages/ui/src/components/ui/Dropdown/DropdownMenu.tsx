import classnames from "classnames"
import { PropsWithChildren } from "react"
import Icon, { IconName } from "../Icon"
import { DropdownCompoundMember } from "./Dropdown"
import { useDropdownContext } from "./DropdownContext"

export interface DropdownMenuProps {
    id: string
    onClick?: () => void
    className?: string
}

export interface DropdownMenuItemProps {
    onClick?: () => void
    className?: string
    value?: any
    selected?: boolean
}

export const DropdownMenu: React.FC<PropsWithChildren<DropdownMenuProps>> &
    DropdownCompoundMember = ({
    children,
    id = "dropdownMenu",
    onClick,
    className,
}) => {
    const { isShowingMenu } = useDropdownContext()
    return (
        <ul
            className={classnames(
                "dropdown-menu", //defines styles for the first and last children
                "absolute shadow-md bg-white mt-2 right-0 select-none rounded-md z-50 font-semibold list-none",
                !isShowingMenu && "hidden",
                className
            )}
            role="menu"
            id={id}
            onClick={(e) => {
                e.stopPropagation()
                onClick && onClick()
            }}
        >
            {children}
        </ul>
    )
}

export const DropdownMenuItem: React.FC<
    PropsWithChildren<DropdownMenuItemProps>
> = ({ onClick, children, className, value, selected }) => {
    const { onClickItem } = useDropdownContext()
    return (
        <li
            onClick={(e) => {
                e.stopPropagation()
                if (onClickItem) {
                    onClickItem(value)
                }
                if (onClick) {
                    onClick()
                }
            }}
            className={classnames(
                "flex flex-row justify-between items-center w-full p-2 cursor-pointer hover:bg-gray-100",
                className || "",
                selected && "text-primary-300"
            )}
        >
            {children}
            {selected && (
                <Icon size="sm" name={IconName.CHECKMARK} profile="selected" />
            )}
        </li>
    )
}
