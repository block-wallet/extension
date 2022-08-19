import { WindowIdContext } from "../context/hooks/useWindowId"

const MockWindowIdProvider: React.FC<{
    windowId?: string
    children: React.ReactNode | undefined
}> = ({ children, windowId }) => {
    return (
        <WindowIdContext.Provider value={{ windowId: windowId ?? "123" }}>
            {children}
        </WindowIdContext.Provider>
    )
}

export default MockWindowIdProvider
