import React from "react"
import LoadingOverlay from "../../components/loading/LoadingOverlay"
import { getWindowId } from "../commActions"

export const WindowIdContext = React.createContext({
    windowId: "",
})

const WindowIdProvider: React.FC = ({ children }) => {
    const [windowId, setWindowId] = React.useState("")

    React.useEffect(() => {
        async function get() {
            const wId = await getWindowId()
            setWindowId(wId)
        }
        get()
    }, [])

    return (
        <WindowIdContext.Provider value={{ windowId }}>
            {!windowId ? <LoadingOverlay /> : children}
        </WindowIdContext.Provider>
    )
}

const useWindowId = () => React.useContext(WindowIdContext)

export { WindowIdProvider }
export default useWindowId
