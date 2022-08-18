import type { BlankAppState } from '../../utils/constants/initialState';
import { BigNumber } from 'ethers';
import BaseStorageStore from './BaseStorageStore';
import { TransactionTypeEnum } from '@block-wallet/background/controllers/TransactionWatcherController';

export default class BlankStorageStore extends BaseStorageStore<BlankAppState> {
    constructor() {
        super('blankState');
    }

    public get(key: string, update: (value: BlankAppState) => void): void {
        /**
         * Iterates through object and rebuilds big numbers
         *
         * @param o Object to rebuild
         */
        const rebuildBigNumbers = (o: any) => {
            Object.keys(o).forEach((k) => {
                if (
                    o[k] !== null &&
                    typeof o[k] === 'object' &&
                    o[k]._isBigNumber !== true
                ) {
                    rebuildBigNumbers(o[k]);
                    return;
                }
                if (
                    o[k] !== null &&
                    typeof o[k] === 'object' &&
                    o[k]._isBigNumber === true
                ) {
                    o[k] = BigNumber.from(o[k]);
                }
            });
        };

        const cb = (value: BlankAppState) => {
            // If value is not found it is undefined
            if (value) {
                // Rebuild transactions
                value.TransactionController.transactions.forEach(
                    (transaction) => {
                        rebuildBigNumbers(transaction);
                    }
                );

                // Rebuild accounts balances
                rebuildBigNumbers(value.AccountTrackerController.accounts);

                // Rebuild ERC20 Transactions
                if ('TransactionWatcherControllerState' in value) {
                    for (const chainId in value
                        .TransactionWatcherControllerState.transactions) {
                        const transactionByAddress =
                            value.TransactionWatcherControllerState
                                .transactions[parseInt(chainId)];

                        for (const address in transactionByAddress) {
                            const transactions = transactionByAddress[address];
                            for (const type in transactions) {
                                const transactionType =
                                    type as TransactionTypeEnum;
                                for (const transactionHash in transactions[
                                    transactionType
                                ].transactions) {
                                    rebuildBigNumbers(
                                        transactions[transactionType]
                                            .transactions[transactionHash]
                                    );
                                }
                            }
                        }
                    }
                }
            }
            update(value);
        };

        super.get(key, cb);
    }

    public set(key: string, value: BlankAppState, update?: () => void): void {
        super.set(key, value, update);
    }
}
