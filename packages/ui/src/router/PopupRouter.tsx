import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import { HashRouter, Redirect, Route, useHistory } from "react-router-dom"
import { useBlankState } from "../context/background/backgroundHooks"
import PendingSetupPage from "../routes/setup/PendingSetupPage"
import UnlockPage from "../routes/UnlockPage"
import { appRoutes } from "./routes"
import "./routeTransitions.css"
import { lockApp } from "../context/commActions"
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
import ProviderDownDialog from "../components/dialog/ProviderDownDialog"
import useClearStickyStorage from "../context/hooks/useClearStickyStorage"
import { getNonSubmittedTransactions } from "../util/getNonSubmittedTransactions"
import { ExchangeRatesStateProvider } from "../context/background/useExchangeRatesState"
import { GasPricesStateProvider } from "../context/background/useGasPricesState"
import { ActivityListStateProvider } from "../context/background/useActivityListState"

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
        expiredStickyStorage,
    } = useBlankState()!
    const unapprovedTransactions = getNonSubmittedTransactions(
        transactions,
        true
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
        if (showPage || showUnlock || expiredStickyStorage) {
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
            <ProviderDownDialog />
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
        chrome.runtime.reload()
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
