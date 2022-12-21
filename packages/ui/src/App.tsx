import GlobalModal from "./components/GlobalModal"
import BackgroundState from "./context/background/BackgroundState"
import { ModalProvider } from "./context/ModalContext"
import Spinner from "./components/spinner/Spinner"
import { useBlankState } from "./context/background/backgroundHooks"
import { isPopup } from "./context/util/isPopup"
import PopupRouter from "./router/PopupRouter"
import TabRouter from "./router/TabRouter"
import { WindowIdProvider } from "./context/hooks/useWindowId"
import { Profiler } from "react"
import useMetricCollector from "./util/useMetricCollector"
import { GasPricesStateProvider } from "./context/background/useGasPricesState"
import { ExchangeRatesStateProvider } from "./context/background/useExchangeRatesState"
import { ActivityListStateProvider } from "./context/background/useActivityListState"

export const AppLoading = () => {
    return (
        <div className="w-full h-full flex flex-row items-center justify-center bg-primary-100">
            <Spinner />
        </div>
    )
}

const App = () => {
    const blankState = useBlankState()
    return blankState ? (
        <ModalProvider>
            <WindowIdProvider>
                <GlobalModal />
                {isPopup() ? (
                    <GasPricesStateProvider>
                        <ExchangeRatesStateProvider>
                            <ActivityListStateProvider>
                                <PopupRouter />
                            </ActivityListStateProvider>
                        </ExchangeRatesStateProvider>
                    </GasPricesStateProvider>
                ) : (
                    <TabRouter />
                )}
            </WindowIdProvider>
        </ModalProvider>
    ) : (
        <AppLoading />
    )
}

const WrappedApp = () => {
    const collect = useMetricCollector()
    return (
        <BackgroundState>
            <Profiler id="app" onRender={collect}>
                <App />
            </Profiler>
        </BackgroundState>
    )
}

export default WrappedApp
