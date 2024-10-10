import { HashRouter } from "react-router-dom"
import { useBlankState } from "../context/background/backgroundHooks"
import IntroductionPage from "../routes/IntroductionPage"
import BackupConfirmPage from "../routes/setup/BackupConfirmPage"
import BackupNoticePage from "../routes/setup/BackupNoticePage"
import PasswordSetupPage from "../routes/setup/PasswordSetupPage"
import SeedImportPage from "../routes/setup/SeedImportPage"
import SetupDonePage from "../routes/setup/SetupDonePage"
import SetupPage from "../routes/setup/SetupPage"
import ResetPage from "../routes/setup/ResetPage"
import ResetDonePage from "../routes/setup/ResetDonePage"
import { makeRoutes } from "../util/makeRoutes"
import HardwareWalletVendorsPage from "../routes/hardware-wallet/VendorsPage"
import HardwareWalletAccountsPage from "../routes/hardware-wallet/AccountsPage"
import HardwareWalletConnectionPage from "../routes/hardware-wallet/HardwareWalletConnectionPage"
import KeystoneConnectionPage from "../routes/hardware-wallet/KeystoneConnectionPage"
import HardwareWalletReconnectionPage from "../routes/hardware-wallet/HardwareWalletReconnectionPage"
import HardwareWalletSuccessPage from "../routes/hardware-wallet/SuccessPage"
import HardwareWalletRemoveDevicePage from "../routes/hardware-wallet/RemoveDevice"
import HardwareWalletRemoveSuccessPage from "../routes/hardware-wallet/RemoveSuccessPage"

const introRoutes = makeRoutes([
    /* Setup */
    { path: "/intro", exact: true, component: IntroductionPage },
    { path: "/setup", exact: true, component: SetupPage },
    { path: "/setup/import", exact: true, component: SeedImportPage },
    { path: "/setup/create", exact: true, component: PasswordSetupPage },
    { path: "/setup/create/notice", exact: true, component: BackupNoticePage },
    { path: "/setup/create/verify", exact: true, component: BackupConfirmPage },
    { path: "/setup/done", exact: true, component: SetupDonePage },
    { path: "/reset", exact: true, component: ResetPage },
    { path: "/reset/done", exact: true, component: ResetDonePage },
    {
        path: "/hardware-wallet",
        exact: true,
        component: HardwareWalletVendorsPage,
    },
    {
        path: "/hardware-wallet/remove-device",
        exact: true,
        component: HardwareWalletRemoveDevicePage,
    },
    {
        path: "/hardware-wallet/remove-device/success",
        exact: true,
        component: HardwareWalletRemoveSuccessPage,
    },
    {
        path: "/hardware-wallet/success",
        exact: true,
        component: HardwareWalletSuccessPage,
    },
    {
        path: "/hardware-wallet/connect",
        exact: true,
        component: HardwareWalletConnectionPage,
    },
    {
        path: "/hardware-wallet/keystone-connect",
        exact: true,
        component: KeystoneConnectionPage,
    },
    {
        path: "/hardware-wallet/:vendor/reconnect",
        exact: true,
        component: HardwareWalletReconnectionPage,
    },
    {
        path: "/hardware-wallet/accounts",
        exact: true,
        component: HardwareWalletAccountsPage,
    },
])

const TabRouter = ({
    children,
}: {
    children?: React.ReactNode | undefined
}) => {
    const state = useBlankState()!
    const rootComponent = state?.isOnboarded ? SetupDonePage : IntroductionPage
    return (
        <HashRouter>
            {makeRoutes([{ path: "/", exact: true, component: rootComponent }])}
            {introRoutes}
            {children}
        </HashRouter>
    )
}

export default TabRouter
