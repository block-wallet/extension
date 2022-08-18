import { createContext, useContext } from "react"

interface DropdownContextData {
    isShowingMenu: boolean
    toggleMenu: (e: Event) => void //Callback for toggling the isShwoingMenu boolean
    onClickItem?: (value: any) => void //Callback invoked when the user clicks one item of the Menu
}

const DropdownContext = createContext<DropdownContextData>({
    isShowingMenu: false,
    toggleMenu: (e: Event) => {},
    onClickItem: (value: any) => {},
})

export const useDropdownContext = () => useContext(DropdownContext)

export default DropdownContext
