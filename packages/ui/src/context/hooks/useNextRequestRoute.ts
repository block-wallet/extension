import {
    getNonSubmittedTransactions,
    TransactionOrigin,
} from "../../util/getNonSubmittedTransactions"
import { useBlankState } from "../background/backgroundHooks"
import getRequestRouteAndStatus from "../util/getRequestRouteAndStatus"

/**
 * It returns the next pending request route
 *
 * @returns The route to the next pending request view
 */
const useNextRequestRoute = () => {
    const { permissionRequests, transactions, dappRequests } = useBlankState()!

    const nonSubmittedTransactions = getNonSubmittedTransactions(
        transactions,
        TransactionOrigin.EXTERNAL_ONLY
    )

    const [isNotEmpty, route] = getRequestRouteAndStatus(
        permissionRequests,
        nonSubmittedTransactions,
        dappRequests
    )

    return isNotEmpty ? route : "/home"
}

export default useNextRequestRoute
