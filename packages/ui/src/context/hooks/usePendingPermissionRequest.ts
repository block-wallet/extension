import { useBlankState } from '../background/backgroundHooks'

export const usePendingPermissionRequest = () => {
    const { permissionRequests } = useBlankState()!

    const requests = Object.keys(permissionRequests)
    const requestCount = requests.length

    // Gets first permission request
    const site = Object.values(permissionRequests)[0]
    const requestId = requests[0]

    return { requestCount, requestId, site }
}