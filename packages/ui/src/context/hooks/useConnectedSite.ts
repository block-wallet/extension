import { useEffect, useState } from "react"
import { useBlankState } from "../background/backgroundHooks"
import { session } from "../setup"

export type connectedSiteStatus =
    | "not-connected"
    | "connected"
    | "connected-warning"

export const useConnectedSite = () => {
    const [isConnected, setIsConnected] = useState<connectedSiteStatus>(
        "not-connected"
    )
    const { permissions, selectedAddress } = useBlankState()!

    useEffect(() => {
        // Status:
        //      Not connected: site does not have permissions.
        //      Connected: origin is in permissions array and active address is the selected address.
        //      Connected with warning: selected address differs from active/connected one.
        let status: connectedSiteStatus = "not-connected"
        if (session !== null && session.origin) {
            const siteHasPermissions =
                session !== null &&
                Object.keys(permissions).includes(session.origin!)

            if (siteHasPermissions) {
                const activeAccountIsSelected =
                    permissions[session.origin].activeAccount ===
                    selectedAddress
                status = activeAccountIsSelected
                    ? "connected"
                    : "connected-warning"
            }
        }

        setIsConnected(status)
    }, [permissions, selectedAddress])

    return isConnected
}
