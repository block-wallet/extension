import { AvailableNetworks } from '../types';
import { IBlankDeposit } from '../BlankDeposit';

export interface BlankDepositVaultState {
    /**
     * The list of Blank deposits
     */
    deposits: IBlankDeposit[];

    /**
     * It indicates whether the deposits are being imported or not
     */
    isLoading: boolean;

    /**
     * It indicates if the deposits have already been imported for this network
     */
    isInitialized: boolean;

    /**
     * It indicates if there were errors while importing the deposits
     */
    errorsInitializing: string[];
}

/**
 * It defines the type for the Blank deposits state
 */
export interface IBlankDepositVaultState {
    deposits: { [network in AvailableNetworks]: BlankDepositVaultState };

    /**
     * Indicates if it is an imported account
     */
    isImported: boolean;
}
