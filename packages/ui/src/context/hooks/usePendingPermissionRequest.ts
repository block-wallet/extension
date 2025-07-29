import { useBlankState } from '../background/backgroundHooks'
import { useEffect, useState } from 'react'
import { PermissionsControllerState } from '@block-wallet/background/controllers/PermissionsController'
import { subscribePermissionRequests } from '../commActions'

export const usePendingPermissionRequest = () => {
    const { permissionRequests: fallback } = useBlankState()!
    const [slice, setSlice] = useState<PermissionsControllerState['permissionRequests'] | null>(null)

    useEffect(() => {
        let mounted = true
        subscribePermissionRequests((s) => {
            if (mounted) setSlice(s)
        })
        return () => {
            mounted = false
        }
    }, [])

    const requests = Object.keys(slice ?? fallback)
    const requestCount = requests.length

    // Gets first permission request
    const site = Object.values(slice ?? fallback)[0]
    const requestId = requests[0]

    return { requestCount, requestId, site }
}
