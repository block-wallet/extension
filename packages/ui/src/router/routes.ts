import { makeRoutes } from "../util/makeRoutes"
import SignPage from "../routes/dApp/SignPage"
import ConnectPage from "../routes/connect/ConnectPage"
import ConnectedSitesPage from "../routes/settings/ConnectedSitesPage"
import ConnectedSiteAccountsPage from "../routes/settings/ConnectedSiteAccountsPage"
import TransactionConfirmPage from "../routes/dApp/TransactionConfirmPage"
import AccountsPage from "../routes/account/AccountsPage"
import PopupPage from "../routes/PopupPage"
import ReceivePage from "../routes/ReceivePage"
import SendConfirmPage from "../routes/send/SendConfirmPage"
import SendPage from "../routes/send/SendPage"
import CreateAccountPage from "../routes/account/CreateAccountPage"
import AddTokensPage from "../routes/settings/AddTokensPage"
import AddTokensConfirmPage from "../routes/settings/AddTokensConfirmPage"
import ExportAccountPage from "../routes/settings/ExportAccountPage"
import ExportDonePage from "../routes/settings/ExportDonePage"
import SettingsPage from "../routes/settings/SettingsPage"
import AboutPage from "../routes/settings/AboutPage"
import ReminderPage from "../routes/ReminderPage"
import BackupConfirmPage from "../routes/setup/BackupConfirmPage"
import BackupDonePage from "../routes/BackupDonePage"
import ErrorFallbackPage from "../components/error/ErrorFallbackPage"
import AddressBookPage from "../routes/settings/AddressBookPage"
import AddContactPage from "../routes/settings/AddContactPage"
import SwitchEthereumChain from "../routes/dApp/SwitchEthereumChain"
import AddEthereumChain from "../routes/dApp/AddEthereumChain"
import LockTimeout from "../routes/settings/LockTimeout"
import AccountMenu from "../components/account/AccountMenu"
import EditAccountPage from "../routes/account/EditAccountPage"
import WatchAssetPage from "../routes/dApp/WatchAsset"
import SpeedUpPage from "../routes/transaction/SpeedUpPage"
import CancelPage from "../routes/transaction/CancelPage"
import ApproveAssetPage from "../routes/dApp/ApproveAsset"
import AssetDetailsPage from "../components/assets/AssetDetailsPage"
import PhishingProtectionPreferencesPage from "../routes/preferences/PhishingProtectionPreferencesPage"
import LocalePreferencesPage from "../routes/preferences/LocalePreferencesPage"
import PreferencesPage from "../routes/settings/PreferencesPage"
import DefaultWalletPreferencesPage from "../routes/preferences/DefaultWalletPreferencesPage"
import ReleaseNotesPreferencesPage from "../routes/preferences/ReleaseNotesPreferencesPage"
import OnDemandReleaseNotesPage from "../components/releaseNotes/OnDemandReleaseNotesPage"
import WelcomeInfo from "../components/info/WelcomeInfo"
import WarningsPreferencesPage from "../routes/preferences/WarningsPreferencesPage"
import { TransitionRouteProps } from "./TransitionRoute"
import ApprovePage from "../routes/transaction/ApprovePage"
import AddAccountPage from "../routes/account/AddAccountPage"
import ImportAccountPage from "../routes/account/ImportAccountPage"
import ApproveNFTPage from "../routes/dApp/ApproveNFT"
import SwapPage from "../routes/swap/SwapPage"
import SwapPageConfirm from "../routes/swap/SwapConfirmPage"
import SwapAfterAddTokenPage from "../routes/swap/SwapAfterAddTokenPage"
import NetworksPage from "../routes/networks/NetworksPage"
import NetworkDetailsPage from "../routes/networks/NetworkDetailsPage"
import SearchNetworkPage from "../routes/networks/SearchNetworkPage"
import SuggestedAddNetwork from "../routes/networks/SuggestedAddNetwork"
import ManuallyAddNetwork from "../routes/networks/ManuallyAddNetwork"
import SetupBridgePage from "../routes/bridge/BridgeSetupPage"
import BridgeConfirmPage from "../routes/bridge/BridgeConfirmPage"
import BridgeAfterAddTokenPage from "../routes/bridge/BridgeAfterAddTokenPage"

export const ROUTES_DEFINITION = [
    /* Root */
    { path: "/home", exact: true, component: PopupPage },
    {
        path: "/release-notes/:version",
        exact: true,
        component: OnDemandReleaseNotesPage,
    },
    /* Transactions */
    { path: "/transaction/cancel", exact: true, component: CancelPage },
    { path: "/transaction/speedUp", exact: true, component: SpeedUpPage },
    { path: "/transaction/approve", exact: true, component: ApprovePage },
    /* My Accounts */
    { path: "/accounts", exact: true, component: AccountsPage },
    {
        path: "/accounts/create",
        exact: true,
        component: CreateAccountPage,
    },
    {
        path: "/accounts/create/add",
        exact: true,
        component: AddAccountPage,
    },
    {
        path: "/accounts/create/import",
        exact: true,
        component: ImportAccountPage,
    },
    { path: "/accounts/menu", exact: true, component: AccountMenu },
    { path: "/accounts/menu/edit", exact: true, component: EditAccountPage },
    /* Receive */
    { path: "/accounts/menu/receive", exact: true, component: ReceivePage },

    {
        path: "/accounts/menu/connectedSites",
        exact: true,
        component: ConnectedSitesPage,
    },
    {
        path: "/accounts/menu/connectedSites/accountList",
        exact: true,
        component: ConnectedSiteAccountsPage,
    },
    /* Send */
    { path: "/send", exact: true, component: SendPage },
    {
        path: "/send/confirm",
        exact: true,
        component: SendConfirmPage,
    },
    /* Swap */
    { path: "/swap", exact: true, component: SwapPage },
    { path: "/swap/confirm", exact: true, component: SwapPageConfirm },
    {
        path: "/swap/afterAddToken",
        exact: true,
        component: SwapAfterAddTokenPage,
    },
    /* Bridge */
    { path: "/bridge", exact: true, component: SetupBridgePage },
    { path: "/bridge/confirm", exact: true, component: BridgeConfirmPage },
    {
        path: "/bridge/afterAddToken",
        exact: true,
        component: BridgeAfterAddTokenPage,
    },

    /* Settings */
    { path: "/settings", exact: true, component: SettingsPage },
    { path: "/settings/about", exact: true, component: AboutPage },
    { path: "/settings/preferences", exact: true, component: PreferencesPage },
    {
        path: "/settings/preferences/phishing",
        exact: true,
        component: PhishingProtectionPreferencesPage,
    },
    {
        path: "/settings/preferences/locale",
        exact: true,
        component: LocalePreferencesPage,
    },

    {
        path: "/settings/preferences/releaseNotes",
        exact: true,
        component: ReleaseNotesPreferencesPage,
    },

    {
        path: "/settings/preferences/warnings",
        exact: true,
        component: WarningsPreferencesPage,
    },

    {
        path: "/settings/preferences/lockTimeout",
        exact: true,
        component: LockTimeout,
    },

    {
        path: "/settings/preferences/defaultWallet",
        exact: true,
        component: DefaultWalletPreferencesPage,
    },

    { path: "/settings/tokens/add", exact: true, component: AddTokensPage },
    {
        path: "/settings/tokens/add/confirm",
        exact: true,
        component: AddTokensConfirmPage,
    },
    {
        path: "/accounts/menu/export",
        exact: true,
        component: ExportAccountPage,
    },
    {
        path: "/accounts/menu/export/done",
        exact: true,
        component: ExportDonePage,
        blockListedForRecovery: true,
    },
    /* Address Book */
    {
        path: "/settings/addressBook",
        exact: true,
        component: AddressBookPage,
    },
    {
        path: "/settings/addressBook/add",
        exact: true,
        component: AddContactPage,
    },
    /** Switch Ethereum Chain */
    { path: "/chain/switch", exact: true, component: SwitchEthereumChain },
    /** Add Ethereum Chain */
    { path: "/chain/add", exact: true, component: AddEthereumChain },
    /* Sign */
    { path: "/sign", exact: true, component: SignPage },
    /* Watch Asset */
    { path: "/asset", exact: true, component: WatchAssetPage },
    /* Asset Details */
    { path: "/asset/details", exact: true, component: AssetDetailsPage },
    /* Connect */
    { path: "/connect", exact: true, component: ConnectPage },
    /* Asset approval */
    { path: "/approveAsset", exact: true, component: ApproveAssetPage },
    /* NFT approval */
    { path: "/approveNFT", exact: true, component: ApproveNFTPage },
    /* Transaction */
    {
        path: "/transaction/confirm",
        exact: true,
        component: TransactionConfirmPage,
        blockListedForRecovery: true,
    },
    /* Networks config */
    { path: "/settings/networks", exact: true, component: NetworksPage },
    {
        path: "/settings/networks/details",
        exact: true,
        component: NetworkDetailsPage,
    },
    {
        path: "/settings/networks/search",
        exact: true,
        component: SearchNetworkPage,
    },
    {
        path: "/settings/networks/add/suggested",
        exact: true,
        component: SuggestedAddNetwork,
    },
    {
        path: "/settings/networks/add/manual",
        exact: true,
        component: ManuallyAddNetwork,
    },
    /* Reminder to backup seed phrase */
    { path: "/reminder", exact: true, component: ReminderPage },
    { path: "/reminder/backup", exact: true, component: BackupConfirmPage },
    { path: "/reminder/backup/done", exact: true, component: BackupDonePage },
    { path: "/error", exact: true, component: ErrorFallbackPage },
    /* Welcome Message */
    { path: "/welcome", exact: true, component: WelcomeInfo },
] as TransitionRouteProps[]

export const appRoutes = makeRoutes(ROUTES_DEFINITION)
