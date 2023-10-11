import { useEffect, useLayoutEffect, useMemo, useState } from "react"

import { HashRouter, Redirect, Route, useHistory } from "react-router-dom"
import { useBlankState } from "../context/background/backgroundHooks"
import PendingSetupPage from "../routes/setup/PendingSetupPage"
import UnlockPage from "../routes/UnlockPage"
import { appRoutes } from "./routes"
import "./routeTransitions.css"
import { LastLocationProvider } from "react-router-last-location"
import { TransitionRoute } from "./TransitionRoute"
import { ErrorBoundary } from "react-error-boundary"
import ErrorFallbackPage from "../components/error/ErrorFallbackPage"
import ErrorDialog from "../components/dialog/ErrorDialog"
import getRequestRouteAndStatus from "../context/util/getRequestRouteAndStatus"
import IdleComponent from "../components/IdleComponent"
import WalletNews from "../components/news/WalletNews"
import LocationHolder from "./LocationHolder"
import { useLocationRecovery } from "../util/hooks/useLocationRecovery"
import { timeExceedsTTL } from "../util/time"
import useClearStickyStorage from "../context/hooks/useClearStickyStorage"
import {
    getNonSubmittedTransactions,
    TransactionOrigin,
} from "../util/getNonSubmittedTransactions"
import browser from "webextension-polyfill"

//10 minutes
const LOCAL_STORAGE_DATA_TTL = 60000 * 10

/**  Purpose of this component is to check in Blank State if there is any pending connect to site or transaction confirm
 *  in order to show that page always, whenever the extension is loaded and unlocked.
 */
const PopupComponent = () => {
    const {
        isOnboarded,
        isAppUnlocked,
        permissionRequests,
        dappRequests,
        transactions,
        lastActiveTime,
    } = useBlankState()!
    const unapprovedTransactions = getNonSubmittedTransactions(
        transactions,
        TransactionOrigin.EXTERNAL_ONLY
    )

    const history = useHistory()
    const { lastLocation, clear: clearLocationRecovery } = useLocationRecovery()
    const { clear: clearStickyStorage } = useClearStickyStorage()

    const showUnlock = useMemo(() => {
        return isOnboarded && !isAppUnlocked
    }, [isOnboarded, isAppUnlocked])

    // Get if we should display the popup and the correct route
    // depending on the order of the requests.
    const [showPage, route] = getRequestRouteAndStatus(
        permissionRequests,
        unapprovedTransactions,
        dappRequests
    )

    useLayoutEffect(() => {
        if (
            showPage ||
            showUnlock ||
            (lastActiveTime &&
                timeExceedsTTL(lastActiveTime, LOCAL_STORAGE_DATA_TTL))
        ) {
            // If the wallet is locked or if we're in a dApp request
            // We should get rid of all the localSotrage stuff.
            clearStickyStorage()

            // This clear should be here to update the local variable "lastLocation"
            clearLocationRecovery()
        } else if (lastLocation) {
            history.replace(lastLocation)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showPage, lastLocation, showUnlock])

    if (showUnlock) {
        return (
            <>
                <Redirect to="/unlock" />
                <TransitionRoute
                    component={UnlockPage}
                    path="/unlock"
                ></TransitionRoute>
            </>
        )
    }
    return (
        <WalletNews>
            <Route path="/" component={LocationHolder} />
            <Route exact path="/">
                {showPage ? <Redirect to={route} /> : <Redirect to="/home" />}
            </Route>
            {appRoutes}
        </WalletNews>
    )
}

const PopupRouter = ({
    children,
}: {
    children?: React.ReactNode | undefined
}) => {
    // Ensure body has popup class to mantain fixed width/height when opening from extension or window
    document.body.classList.add("popup")
    const state = useBlankState()!
    const isOnboarded = state?.isOnboarded
    const resetHandler = async () => {
        browser.runtime.reload()
    }

    const [shouldShowDialog, setShouldShowDialog] = useState(false)

    useEffect(() => {
        setShouldShowDialog(!state.isUserNetworkOnline)
    }, [state.isUserNetworkOnline])

    return (
        <HashRouter>
            <LastLocationProvider>
                <ErrorBoundary
                    FallbackComponent={ErrorFallbackPage}
                    onReset={resetHandler}
                    resetKeys={[state.isAppUnlocked]}
                >
                    {isOnboarded ? (
                        <>
                            <ErrorDialog
                                onClickOutside={() =>
                                    setShouldShowDialog(false)
                                }
                                title="No connection"
                                message="Please check your internet connection. Some features of the wallet will remain disabled while you’re offline."
                                open={shouldShowDialog}
                                onDone={() => setShouldShowDialog(false)}
                            />
                            <IdleComponent>
                                <PopupComponent />
                            </IdleComponent>
                        </>
                    ) : (
                        <PendingSetupPage />
                    )}
                    {children}
                </ErrorBoundary>
            </LastLocationProvider>
        </HashRouter>
    )
}

export default PopupRouter
