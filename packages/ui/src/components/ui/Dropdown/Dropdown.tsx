import React, { useRef, useState, FC } from "react"
import { IconName } from "../Icon"
import { useOnClickOutside } from "../../../util/useOnClickOutside"
import {
    DropdownButton,
    DropdownButtonBaseProps,
    DropdownIconButton,
} from "./DropdownButton"
import DropdownContext from "./DropdownContext"
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuItemProps,
    DropdownMenuProps,
} from "./DropdownMenu"

//Dropdown
interface DropdownProps {
    onClickItem?: (value: any) => void
}

export interface DropdownCompoundMember {
    compoundName?: string
}

interface CompoundProps {
    Menu: React.FC<DropdownMenuProps> & DropdownCompoundMember
    Button: React.FC<DropdownButtonBaseProps> & DropdownCompoundMember
    MenuItem: React.FC<DropdownMenuItemProps>
}

const Dropdown: FC<DropdownProps> & CompoundProps = ({
    children,
    onClickItem,
}) => {
    const [isShowingMenu, setIsShowingMenu] = useState<boolean>(false)
    const ref = useRef(null)
    useOnClickOutside(ref, () => setIsShowingMenu(false))
    let menuRender = null
    let buttonRender = null
    React.Children.forEach(children, (child) => {
        const { type } = child as React.ReactElement<any>
        const compundMember = (type as DropdownCompoundMember).compoundName
        if (compundMember === "DropdownMenu") {
            menuRender = child
        }
        if (compundMember === "DropdownButton") {
            buttonRender = child
        }
    })

    const toggleMenu = (e: Event) => {
        e.stopPropagation()
        setIsShowingMenu((prev) => !prev)
    }
    return (
        <DropdownContext.Provider
            value={{
                toggleMenu,
                isShowingMenu,
                onClickItem,
            }}
        >
            <div className="relative" ref={ref}>
                {buttonRender || (
                    <DropdownButton>
                        <DropdownIconButton iconName={IconName.THREE_DOTS} />
                    </DropdownButton>
                )}
                {menuRender}
            </div>
        </DropdownContext.Provider>
    )
}

DropdownButton.compoundName = "DropdownButton"
DropdownMenu.compoundName = "DropdownMenu"

Dropdown.Menu = DropdownMenu
Dropdown.Button = DropdownButton
Dropdown.MenuItem = DropdownMenuItem

export default Dropdown
