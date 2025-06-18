import GlobalModal from "./components/GlobalModal"
import BackgroundState from "./context/background/BackgroundState"
import { ModalProvider } from "./context/ModalContext"
import Spinner from "./components/spinner/Spinner"
import { useBlankState } from "./context/background/backgroundHooks"
import { isPopup } from "./context/util/isPopup"
import PopupRouter from "./router/PopupRouter"
import TabRouter from "./router/TabRouter"
import { WindowIdProvider } from "./context/hooks/useWindowId"
import { ThemeProvider } from "./context/ThemeProvider"

const AppLoading = () => {
    return (
        <div className="w-full h-full flex flex-row items-center justify-center bg-primary-grey-default">
            <Spinner />
        </div>
    )
}

const App = () => {
    const blankState = useBlankState()
    return blankState ? (
        <ThemeProvider>
            <ModalProvider>
                <WindowIdProvider>
                    <GlobalModal />
                    {isPopup() ? <PopupRouter /> : <TabRouter />}
                </WindowIdProvider>
            </ModalProvider>
        </ThemeProvider>
    ) : (
        <AppLoading />
    )
}

const WrappedApp = () => (
    <BackgroundState>
        <App />
    </BackgroundState>
)

export default WrappedApp
