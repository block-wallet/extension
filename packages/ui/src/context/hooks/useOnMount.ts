/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo } from "react"
import { useHistory } from "react-router"
import { useLocation } from "react-router-dom"
import { useLastLocation } from "react-router-last-location"

export const useOnMountHistory = <T = any>() => {
    const history = useHistory<T>()
    return useMemo(() => ({ ...history }), []) as typeof history
}

export const useOnMountLocation = <T = any>() => {
    const location = useLocation<T>()
    return useMemo(() => ({ ...location }), []) as typeof location
}

export const useOnMountLastLocation = () => {
    const lastLocation = useLastLocation()
    return useMemo(() => ({ ...lastLocation }), []) as typeof lastLocation
}
