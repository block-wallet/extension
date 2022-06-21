import { useEffect } from "react"
import { useHistory } from "react-router-dom"
import useLocalStorageState from "./useLocalStorageState"

const LAST_LOCATION_KEY = "lastLocation"

const useLocationRecovery = () => {
    const [lastLocation, setLastLocation] = useLocalStorageState(
        LAST_LOCATION_KEY,
        {
            initialValue: undefined,
            volatile: false,
        }
    )
    return {
        clear: () => setLastLocation(undefined),
        lastLocation,
        persist: setLastLocation,
    }
}

const useLocationRecoveryListener = (blockList: string[] = []) => {
    const { location } = useHistory()
    const { persist, clear } = useLocationRecovery()
    useEffect(() => {
        async function store() {
            if (!blockList.includes(location.pathname)) {
                persist(location)
            } else {
                clear()
            }
        }
        store()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location, blockList])
}

export { useLocationRecovery, useLocationRecoveryListener }
