import { toChecksumAddress } from '@ethereumjs/util';
import { BaseController } from '../infrastructure/BaseController';

export interface UserSettings {
    // Setting that indicates if a warning is shown when receiving a transaction from an address different from the selected one.
    hideAddressWarning: boolean;
    // Setting that indicates if a warning is shown when sending a transaction to a contract address.
    hideSendToContractWarning: boolean;
    // Setting that indicates if a warning is shown when sending a transaction to null address.
    hideSendToNullWarning: boolean;
    subscribedToReleaseaNotes: boolean;
    subscribedToNotifications: boolean;
    useAntiPhishingProtection: boolean;
    defaultBrowserWallet: boolean;
    hideEstimatedGasExceedsThresholdWarning: boolean;
    //whether we should display the warning while making a deposit with an external/hardware account or not.
    hideDepositsExternalAccountsWarning: boolean;
    hideBridgeInsufficientNativeTokenWarning: boolean;

    // Indicates if the wallet displays net worth in native currency value or native token balance.
    displayNetWorth: boolean;
}

export interface Note {
    type: 'success' | 'warn';
    message: string;
}

interface NoteSection {
    title: string;
    notes: Note[];
}
export interface ReleaseNote {
    version: string;
    sections: NoteSection[];
}

interface ReleaseNotesSettings {
    latestReleaseNotes: ReleaseNote[];
    lastVersionUserSawNews: string;
}
interface FilterPreferences {
    account: string[];
}

export type PopupTabs = 'activity' | 'assets';
export type DefaultGasOptions = 'low' | 'medium' | 'high';

export interface PreferencesControllerState {
    selectedAddress: string;
    localeInfo: string;
    nativeCurrency: string;
    showTestNetworks: boolean;
    popupTab: PopupTabs;
    settings: UserSettings;
    antiPhishingImage: string;
    showWelcomeMessage: boolean;
    showDefaultWalletPreferences: boolean;
    releaseNotesSettings: ReleaseNotesSettings;
    filters: FilterPreferences;
    defaultGasOption: DefaultGasOptions;
    hotkeysEnabled: boolean;
    tokensSortValue: string;
    hideSmallBalances: boolean;
}

export interface PreferencesControllerProps {
    initState: PreferencesControllerState;
}
export enum PreferencesControllerEvents {
    SELECTED_ACCOUNT_CHANGED = 'SELECTED_ACCOUNT_CHANGED',
}

export class PreferencesController extends BaseController<PreferencesControllerState> {
    constructor(props: PreferencesControllerProps) {
        super(props.initState);
    }

    /**
     * It returns the user selected address
     *
     */
    public getSelectedAddress(): string {
        return this.store.getState().selectedAddress;
    }

    /**
     * Sets the user selected address
     *
     * @param address One of the user's address
     */
    public setSelectedAddress(address: string): void {
        // Checksum address
        if (address) {
            address = toChecksumAddress(address);
        }

        if (address != this.store.getState().selectedAddress) {
            this.emit(
                PreferencesControllerEvents.SELECTED_ACCOUNT_CHANGED,
                address
            );
        }

        // Update state
        this.store.updateState({ selectedAddress: address });
    }

    /**
     * Sets the showWelcomeMessage flag
     * @param showWelcomeMessage welcome message flag
     */
    public setShowWelcomeMessage(showWelcomeMessage: boolean): void {
        this.store.updateState({
            showWelcomeMessage,
        });
    }

    /**
     * Sets the shhowDefaultWalletPreferences flag
     * @param showDefaultWalletPreferences default browser wallet preference flag
     */
    public setShowDefaultWalletPreferences(
        showDefaultWalletPreferences: boolean
    ): void {
        this.store.updateState({
            showDefaultWalletPreferences,
        });
    }

    public initReleaseNotesSettings(currentVersion: string): void {
        this.store.updateState({
            releaseNotesSettings: {
                latestReleaseNotes: [],
                lastVersionUserSawNews: currentVersion,
            },
        });
    }

    /**
     * Gets user selected locale info
     */
    public get localeInfo(): string {
        return this.store.getState().localeInfo;
    }

    /**
     * Sets user selected locale info
     *
     * @param v locale info
     */
    public set localeInfo(v: string) {
        this.store.updateState({ localeInfo: v });
    }

    /**
     * Gets user selected native currency
     */
    public get nativeCurrency(): string {
        return this.store.getState().nativeCurrency;
    }

    /**
     * Sets user selected native currency
     *
     * @param v native currency
     */
    public set nativeCurrency(v: string) {
        this.store.updateState({ nativeCurrency: v });
    }

    /**
     * It returns value indicating if UI should show test networks on list.
     */
    public get showTestNetworks(): boolean {
        return this.store.getState().showTestNetworks;
    }

    /**
     * Sets showTestNetworks value.
     */
    public set showTestNetworks(showTestNetworks: boolean) {
        this.store.updateState({ showTestNetworks: showTestNetworks });
    }

    /**
     * It returns value indicating what tab the popup page should show
     */
    public get popupTab(): PopupTabs {
        return this.store.getState().popupTab;
    }

    /**
     * It returns value indicating what tab the popup page should show
     */
    public set popupTab(popupTab: PopupTabs) {
        this.store.updateState({ popupTab: popupTab });
    }

    /**
     * Gets the default gas option preference
     */
    public get defaultGasOption(): DefaultGasOptions {
        return this.store.getState().defaultGasOption;
    }

    /**
     * It returns the default gas option
     */
    public set defaultGasOption(defaultGasOption: DefaultGasOptions) {
        this.store.updateState({ defaultGasOption });
    }

    /**
     * Gets user settings.
     */
    public get settings(): UserSettings {
        return this.store.getState().settings;
    }

    /**
     * Sets user settings
     *
     * @param s settings
     */
    public set settings(s: UserSettings) {
        this.store.updateState({ settings: s });
    }

    /**
     * assignNewPhishingPreventionImage
     *
     * This function assigns an anti-phishing image to users profile.
     */
    public async assignNewPhishingPreventionImage(
        phishingPreventionImage: string
    ): Promise<void> {
        this.antiPhishingImage = phishingPreventionImage;
    }

    /**
     * Sets antiPhishingImage value
     */
    public set antiPhishingImage(base64Image: string) {
        this.store.updateState({ antiPhishingImage: base64Image });
    }

    /**
     * Gets antiPhishingImage value
     */
    public get antiPhishingImage(): string {
        return this.store.getState().antiPhishingImage;
    }

    /**
     * Gets showWelcomeMessage value.
     */
    public get showWelcomeMessage(): boolean {
        return this.store.getState().showWelcomeMessage;
    }

    /**
     * Sets showWelcomeMessage value.
     */
    public set showWelcomeMessage(showWelcomeMessage: boolean) {
        this.store.updateState({ showWelcomeMessage });
    }

    /**
     * Gets showDefaultWalletPreferences value.
     */
    public get showDefaultWalletPreferences(): boolean {
        return this.store.getState().showDefaultWalletPreferences;
    }
    /**
     * Sets showDefaultWalletPreferences value.
     */
    public set showDefaultWalletPreferences(
        showDefaultWalletPreferences: boolean
    ) {
        this.store.updateState({ showDefaultWalletPreferences });
    }

    public set filters(filters: Partial<FilterPreferences>) {
        this.store.updateState({
            filters: {
                ...this.store.getState().filters,
                ...filters,
            },
        });
    }

    public set releaseNotesSettings(
        releaseNotesSettings: ReleaseNotesSettings
    ) {
        this.store.updateState({ releaseNotesSettings });
    }

    public get releaseNotesSettings(): ReleaseNotesSettings {
        return this.store.getState().releaseNotesSettings;
    }

    /**
     * Updates the anti-phishing protection flag status in the store.
     */
    public updateAntiPhishingProtectionStatus(enabled: boolean): void {
        return this.store.updateState({
            settings: {
                ...this.settings,
                useAntiPhishingProtection: enabled,
            },
        });
    }

    /**
     * Updates the release notes subscription flag status in the store.
     */
    public updateReleseNotesSubscriptionStatus(enabled: boolean): void {
        return this.store.updateState({
            settings: {
                ...this.settings,
                subscribedToReleaseaNotes: enabled,
            },
        });
    }

    /**
     * Update the default browser wallet flag status in the store.
     */
    public updateDefaultBrowserWalletStatus(enabled: boolean): void {
        return this.store.updateState({
            settings: {
                ...this.settings,
                defaultBrowserWallet: enabled,
            },
        });
    }

    /**
     * Gets if hotkeys are allowed in the extension
     */
    public get hotkeysStatus(): boolean {
        return this.store.getState().hotkeysEnabled;
    }

    /**
     * Set if hotkeys are allowed in the extension
     *
     * @param enabled hotkeys status
     */
    public set hotkeysStatus(enabled: boolean) {
        this.store.updateState({ hotkeysEnabled: enabled });
    }

    /**
     * Gets tokens sort value
     */
    public get tokensSortValue(): string {
        return this.store.getState().tokensSortValue;
    }

    /**
     * Sets tokens sort value
     */
    public set tokensSortValue(sortValue: string) {
        this.store.updateState({ tokensSortValue: sortValue });
    }

    /**
     * Gets if hideSmallBalances is allowed in the extension
     */
    public get hideSmallBalances(): boolean {
        return this.store.getState().hideSmallBalances;
    }

    /**
     * Set if hideSmallBalances is allowed in the extension
     *
     * @param enabled hideSmallBalances status
     */
    public set hideSmallBalances(enabled: boolean) {
        this.store.updateState({ hideSmallBalances: enabled });
    }
}
