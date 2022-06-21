import React from "react"
import { WindowIdContext } from "../context/hooks/useWindowId"

const MockWindowIdProvider: React.FC<{ windowId?: string }> = ({
    children,
    windowId,
}) => {
    return (
        <WindowIdContext.Provider value={{ windowId: windowId ?? "123" }}>
            {children}
        </WindowIdContext.Provider>
    )
}

export default MockWindowIdProvider
