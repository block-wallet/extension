import { makeRoutes } from "../util/makeRoutes"
import SignPage from "../routes/dApp/SignPage"
import ConnectPage from "../routes/connect/ConnectPage"
import ConnectedSitesPage from "../routes/settings/ConnectedSitesPage"
import ConnectedSiteAccountsPage from "../routes/settings/ConnectedSiteAccountsPage"
import PrivacyPage from "../routes/PrivacyPage"
import TransactionConfirmPage from "../routes/dApp/TransactionConfirmPage"
import AccountsPage from "../routes/account/AccountsPage"
import DepositConfirmPage from "../routes/deposit/DepositConfirmPage"
import DepositPage from "../routes/deposit/DepositPage"
import PopupPage from "../routes/PopupPage"
import ReceivePage from "../routes/ReceivePage"
import SendConfirmPage from "../routes/send/SendConfirmPage"
import SendDonePage from "../routes/send/SendDonePage"
import SendPage from "../routes/send/SendPage"
import CreateAccountPage from "../routes/account/CreateAccountPage"
import AddTokensPage from "../routes/settings/AddTokensPage"
import AddTokensConfirmPage from "../routes/settings/AddTokensConfirmPage"
import ExportAccountPage from "../routes/settings/ExportAccountPage"
import ExportDonePage from "../routes/settings/ExportDonePage"
import SettingsPage from "../routes/settings/SettingsPage"
import AboutPage from "../routes/settings/AboutPage"
import WithdrawAmountPage from "../routes/withdraw/WithdrawAmountPage"
import WithdrawDonePage from "../routes/withdraw/WithdrawDonePage"
import WithdrawHistory from "../routes/withdraw/WithdrawHistory"
import WithdrawExternalAccountPage from "../routes/withdraw/WithdrawExternalAccountPage"
import WithdrawTypeSelectPage from "../routes/withdraw/WithdrawTypeSelectPage"
import ReminderPage from "../routes/ReminderPage"
import BackupConfirmPage from "../routes/setup/BackupConfirmPage"
import BackupDonePage from "../routes/BackupDonePage"
import ErrorFallbackPage from "../components/error/ErrorFallbackPage"
import AddressBookPage from "../routes/settings/AddressBookPage"
import AddContactPage from "../routes/settings/AddContactPage"
import SwitchEthereumChain from "../routes/dApp/SwitchEthereumChain"
import LockTimeout from "../routes/settings/LockTimeout"
import WithdrawBlankSelectAccount from "../routes/withdraw/WithdrawBlankSelectAccount"
import WithdrawBlankCreateAccount from "../routes/withdraw/WithdrawBlankCreateAccount"
import WithdrawBlankConfirm from "../routes/withdraw/WithdrawBlankConfirm"
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

export const ROUTES_DEFINITION = [
    /* Root */
    { path: "/home", exact: true, component: PopupPage },
    { path: "/release-notes/:version", exact: true, component: OnDemandReleaseNotesPage },
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
    { path: "/send/done", exact: true, component: SendDonePage },
    /* Deposit */
    { path: "/privacy/deposit", exact: true, component: DepositPage },
    {
        path: "/privacy/deposit/confirm",
        exact: true,
        component: DepositConfirmPage,
    },
    /* Withdraw */
    { path: "/privacy/withdraw", exact: true, component: WithdrawAmountPage },
    {
        path: "/privacy/withdraw/select",
        exact: true,
        component: WithdrawTypeSelectPage,
    },
    {
        path: "/privacy/withdraw/block/accounts",
        exact: true,
        component: WithdrawBlankSelectAccount,
    },
    {
        path: "/privacy/withdraw/block/accounts/create",
        exact: true,
        component: WithdrawBlankCreateAccount,
    },
    {
        path: "/privacy/withdraw/block/accounts/step/confirm",
        exact: true,
        component: WithdrawBlankConfirm,
    },

    {
        path: "/privacy/withdraw/external",
        exact: true,
        component: WithdrawExternalAccountPage,
    },
    {
        path: "/privacy/withdraw/done",
        exact: true,
        component: WithdrawDonePage,
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

    {
        path: "/privacy",
        exact: true,
        component: PrivacyPage,
    },
    {
        path: "/privacy/withdrawals",
        exact: true,
        component: WithdrawHistory,
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
    /* Reminder to backup seed phrase */
    { path: "/reminder", exact: true, component: ReminderPage },
    { path: "/reminder/backup", exact: true, component: BackupConfirmPage },
    { path: "/reminder/backup/done", exact: true, component: BackupDonePage },
    { path: "/error", exact: true, component: ErrorFallbackPage },
    /* Welcome Message */
    { path: "/welcome", exact: true, component: WelcomeInfo },
] as TransitionRouteProps[]

export const appRoutes = makeRoutes(ROUTES_DEFINITION)
