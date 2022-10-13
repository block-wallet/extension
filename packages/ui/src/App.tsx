import GlobalModal from "./components/GlobalModal"
import BackgroundState from "./context/background/BackgroundState"
import { ModalProvider } from "./context/ModalContext"
import Spinner from "./components/spinner/Spinner"
import { useBlankState } from "./context/background/backgroundHooks"
import { isPopup } from "./context/util/isPopup"
import PopupRouter from "./router/PopupRouter"
import TabRouter from "./router/TabRouter"
import { WindowIdProvider } from "./context/hooks/useWindowId"

const AppLoading = () => {
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
                {isPopup() ? <PopupRouter /> : <TabRouter />}
            </WindowIdProvider>
        </ModalProvider>
    ) : (
        <AppLoading />
    )
}

const WrappedApp = () => <BackgroundState />

export default WrappedApp
