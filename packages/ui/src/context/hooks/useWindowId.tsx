import { createContext, useContext, useEffect, useState } from "react"
import { AppLoading } from "../../App"
import { getWindowId } from "../commActions"

export const WindowIdContext = createContext({
    windowId: "",
})

const WindowIdProvider = ({
    children,
}: {
    children: React.ReactNode | undefined
}) => {
    const [windowId, setWindowId] = useState("")

    useEffect(() => {
        async function get() {
            const wId = await getWindowId()
            setWindowId(wId)
        }
        get()
    }, [])

    return (
        <WindowIdContext.Provider value={{ windowId }}>
            {!windowId ? <AppLoading /> : children}
        </WindowIdContext.Provider>
    )
}

const useWindowId = () => useContext(WindowIdContext)

export { WindowIdProvider }
export default useWindowId
