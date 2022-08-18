import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { ActionsTimeInterval } from '../../../../utils/constants/networks';
import { IMigration } from '../IMigration';
import { TransactionMeta } from '../../../../controllers/transactions/utils/types';
import { SECOND } from '../../../../utils/constants/time';

/**
 * Migrates ERC20TransactionWatcherControllerState and IncomingTransactionController to
 * TransactionWatcherControllerState
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        // networks
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        for (const network in updatedNetworks) {
            const intervals = updatedNetworks[network]
                .actionsTimeIntervals as any;

            if ('erc20TransactionWatcherUpdate' in intervals) {
                updatedNetworks[
                    network
                ].actionsTimeIntervals.transactionWatcherUpdate =
                    intervals['erc20TransactionWatcherUpdate'];
            } else {
                updatedNetworks[
                    network
                ].actionsTimeIntervals.transactionWatcherUpdate = 45 * SECOND;
            }

            if ('incomingTransactionsUpdate' in intervals) {
                delete intervals['incomingTransactionsUpdate'];
            }
            updatedNetworks[network] = {
                ...updatedNetworks[network],
                actionsTimeIntervals: intervals as ActionsTimeInterval,
            };
        }

        // transactions
        enum TransactionTypeEnum {
            Native = 'txlist',
            ERC20 = 'tokentx',
            ERC721 = 'tokennfttx',
            ERC1155 = 'token1155tx',
        }

        const TWCS: {
            transactions: {
                [chainId: number]: {
                    [address: string]: {
                        [type in TransactionTypeEnum]: {
                            transactions: {
                                [txHash: string]: TransactionMeta;
                            };
                            lastBlockQueried: number;
                        };
                    };
                };
            };
        } = {
            transactions: {},
        } as any;

        if (
            'ERC20TransactionWatcherControllerState' in (persistedState as any)
        ) {
            const erc20 = TransactionTypeEnum.ERC20;
            const PS = (persistedState as any)[
                'ERC20TransactionWatcherControllerState'
            ];
            if (PS && PS.transactions) {
                for (const ci in PS.transactions) {
                    const chain = parseInt(ci);
                    for (const add in PS.transactions[chain]) {
                        if (!(chain in TWCS.transactions)) {
                            TWCS.transactions[chain] = {};
                        }
                        if (!(add in TWCS.transactions[chain])) {
                            TWCS.transactions[chain][add] = {} as any;
                        }

                        if (!(erc20 in TWCS.transactions[chain][add])) {
                            TWCS.transactions[chain][add][erc20] = {
                                lastBlockQueried: 0,
                                transactions: {},
                            };
                        }

                        for (const th in PS.transactions[chain][add]
                            .incomingTransactions) {
                            TWCS.transactions[chain][add][erc20].transactions[
                                th
                            ] =
                                PS.transactions[chain][
                                    add
                                ].incomingTransactions[th];
                        }

                        for (const th in PS.transactions[chain][add]
                            .outgoingTransactions) {
                            TWCS.transactions[chain][add][erc20].transactions[
                                th
                            ] =
                                PS.transactions[chain][
                                    add
                                ].outgoingTransactions[th];
                        }

                        TWCS.transactions[chain][add][erc20].lastBlockQueried =
                            PS.transactions[chain][add].lastBlockQueried;
                    }
                }
            }
        }

        if ('IncomingTransactionController' in (persistedState as any)) {
            const native = TransactionTypeEnum.Native;
            const IT = (persistedState as any)['IncomingTransactionController'];
            if (IT && IT.incomingTransactions) {
                for (const add in IT.incomingTransactions) {
                    for (const netName in IT.incomingTransactions[add]) {
                        if (netName in availableNetworks) {
                            const chain = availableNetworks[netName].chainId;
                            if (!(chain in TWCS.transactions)) {
                                TWCS.transactions[chain] = {};
                            }
                            if (!(add in TWCS.transactions[chain])) {
                                TWCS.transactions[chain][add] = {} as any;
                            }

                            if (!(native in TWCS.transactions[chain][add])) {
                                TWCS.transactions[chain][add][native] = {
                                    lastBlockQueried: 0,
                                    transactions: {},
                                };
                            }

                            for (const th in IT.incomingTransactions[add][
                                netName
                            ].list) {
                                TWCS.transactions[chain][add][
                                    native
                                ].transactions[th] =
                                    IT.incomingTransactions[add][netName].list[
                                        th
                                    ];
                            }

                            TWCS.transactions[chain][add][
                                native
                            ].lastBlockQueried =
                                IT.incomingTransactions[add][
                                    netName
                                ].lastBlockQueried;
                        }
                    }
                }
            }
        }

        // final state
        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
            TransactionWatcherControllerState: {
                ...persistedState.TransactionWatcherControllerState,
                ...TWCS,
            },
        };
    },
    version: '0.5.2',
} as IMigration;
