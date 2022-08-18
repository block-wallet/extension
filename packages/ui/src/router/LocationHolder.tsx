import { useLocationRecoveryListener } from "../util/hooks/useLocationRecovery"
import { ROUTES_DEFINITION } from "./routes"

/**
 * Grab all the blocklisted routes in the definitions to avoid store it's location
 */
const BLOCKLISTED_PATHNAMES: string[] = (ROUTES_DEFINITION || [])
    .filter(({ blockListedForRecovery }) => blockListedForRecovery)
    .map((route) => route.path!)
    .concat(["/unlock"]) as string[]

/**
 * Dummy component that stores user last location in the local storage
 */
const LocationHolder = () => {
    useLocationRecoveryListener(BLOCKLISTED_PATHNAMES)
    return null
}

export default LocationHolder
