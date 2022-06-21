import React from "react"

interface DropdownContextData {
    isShowingMenu: boolean
    toggleMenu: (e: Event) => void //Callback for toggling the isShwoingMenu boolean
    onClickItem?: (value: any) => void //Callback invoked when the user clicks one item of the Menu
}

const DropdownContext = React.createContext<DropdownContextData>({
    isShowingMenu: false,
    toggleMenu: (e: Event) => {},
    onClickItem: (value: any) => {},
})

export const useDropdownContext = () => React.useContext(DropdownContext)

export default DropdownContext
