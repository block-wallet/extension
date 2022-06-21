/* eslint-disable @typescript-eslint/no-explicit-any */
import IndexedDB from '../../../../infrastructure/stores/IndexedDB';
import ITornadoEventsDB, {
    Deposit,
    DepositsEventsDbKey,
    Withdrawal,
    WithdrawalsEventsDbKey,
} from './ITornadoEventsDB';
import { TornadoEvents } from '../config/ITornadoContract';
import {
    AvailableNetworks,
    CurrenciesByChain,
    CurrencyAmountArray,
    CurrencyAmountPair,
    KnownCurrencies,
} from '../../types';
import { StoreNames } from 'idb';

export type EventsUpdateType =
    | {
          type: TornadoEvents.DEPOSIT;
          events: Deposit[];
      }
    | {
          type: TornadoEvents.WITHDRAWAL;
          events: Withdrawal[];
      };

export class TornadoEventsDB extends IndexedDB<ITornadoEventsDB> {
    /**
     * getDepositTableName
     *
     * @param network The current network
     * @param param1 The destructured currency/amount pair
     * @returns The string formatted deposits store specified instance
     */
    public getDepositTableName(
        network: AvailableNetworks,
        { currency, amount }: CurrencyAmountPair
    ): DepositsEventsDbKey {
        return `deposits-${network}-${currency}-${amount}` as DepositsEventsDbKey;
    }

    /**
     * getWithdrawalTableName
     *
     * @param network The current network
     * @param param1 The destructured currency/amount pair
     * @returns The string formatted withdrawal store specified instance
     */
    private getWithdrawalTableName(
        network: AvailableNetworks,
        { currency, amount }: CurrencyAmountPair
    ) {
        return `withdrawals-${network}-${currency}-${amount}` as WithdrawalsEventsDbKey;
    }

    /**
     * getStoreInstance
     *
     * @param eventType The event type
     * @param network The current network
     * @param pair The currency/amount pair
     * @returns The string formatted specified instance
     */
    private getStoreInstanceName(
        eventType: TornadoEvents,
        network: AvailableNetworks,
        pair: CurrencyAmountPair
    ) {
        return eventType === TornadoEvents.DEPOSIT
            ? this.getDepositTableName(network, pair)
            : this.getWithdrawalTableName(network, pair);
    }

    /**
     * getLastQueriedBlock
     *
     * @param eventType The event type
     * @param network The current network
     * @param pair The currency/amount pair
     * @returns The specified instance last queried block
     */
    public async getLastQueriedBlock(
        eventType: TornadoEvents,
        network: AvailableNetworks,
        pair: CurrencyAmountPair
    ): Promise<number> {
        const instance = this.getStoreInstanceName(eventType, network, pair);

        let value = (await this.getValue(
            'lastEvents',
            instance
        )) as ITornadoEventsDB['lastEvents']['value'];
        if (!value) {
            value = { instance, lastQueriedBlock: 0 };
            await this.putValue('lastEvents', value);
        }

        return value.lastQueriedBlock;
    }

    /**
     * It returns the last leaf index from the specified deposit events list
     *
     * @param network The current network
     * @param pair The currency/amount pair
     * @returns The specified instance last leaf index
     */
    public async getLastLeafIndex(
        network: AvailableNetworks,
        pair: CurrencyAmountPair
    ): Promise<number> {
        const instance = this.getDepositTableName(network, pair);

        const cursor = await this.getIndexCursor(instance);
        if (!cursor) {
            return 0;
        }
        const { leafIndex } = {
            ...(cursor.value as Deposit),
        };

        return leafIndex;
    }

    public async getLastEventIndex(
        eventType: TornadoEvents,
        network: AvailableNetworks,
        pair: CurrencyAmountPair
    ): Promise<number> {
        const instance = this.getStoreInstanceName(eventType, network, pair);

        return this.countAllValues(instance);
    }

    /**
     * updateLastQueriedBlock
     *
     * It updates the lastQueriedBlock for the specified instance
     * @param eventType The event type
     * @param network The current network
     * @param pair The currency/amount pair
     */
    public async updateLastQueriedBlock(
        eventType: TornadoEvents,
        network: AvailableNetworks,
        pair: CurrencyAmountPair,
        lastQueriedBlock: number
    ): Promise<string | number> {
        const instance = this.getStoreInstanceName(eventType, network, pair);

        return this.putValue('lastEvents', {
            instance,
            lastQueriedBlock,
        } as ITornadoEventsDB['lastEvents']['value']);
    }

    /**
     * isSpent
     *
     * @param network The current network
     * @param pair The currency/amount pair
     * @param nullifier The nullifier hex to filter to
     *
     * @returns Whether or not the deposit has been spent
     */
    public async isSpent(
        network: AvailableNetworks,
        pair: CurrencyAmountPair,
        nullifier: string
    ): Promise<boolean> {
        const isSpent = await this.getWithdrawalEventByNullifier(
            network,
            pair,
            nullifier
        );
        return !!isSpent;
    }

    /**
     * getWithdrawalEventByNullifier
     *
     * @param network The current network
     * @param pair The currency/amount pair
     * @param nullifier The nullifier hex to filter to
     *
     * @returns The nullifier withdrawal event
     */
    public async getWithdrawalEventByNullifier(
        network: AvailableNetworks,
        pair: CurrencyAmountPair,
        nullifier: string
    ): Promise<Withdrawal | undefined> {
        const instance = this.getWithdrawalTableName(network, pair);

        return this.getValue(instance, nullifier) as Promise<
            Withdrawal | undefined
        >;
    }

    /**
     * getDepositEventByCommitment
     *
     * @param network The current network
     * @param pair The currency/amount pair
     * @param commitment The commitment to filter to
     *
     * @returns The commitment deposit event
     */
    public async getDepositEventByCommitment(
        network: AvailableNetworks,
        pair: CurrencyAmountPair,
        commitment: string
    ): Promise<Deposit | undefined> {
        const instance = this.getDepositTableName(network, pair);

        return this.getValueFromIndex(
            instance,
            'commitment',
            commitment
        ) as Promise<Deposit | undefined>;
    }

    /**
     * getAllDepositsByLeafIndex
     *
     * @param network The current network
     * @param pair The currency/amount pair
     * @returns All the deposits events ordered by leafIndex
     */
    public async getAllDepositsByLeafIndex(
        network: AvailableNetworks,
        pair: CurrencyAmountPair,
        lastLeafIndex?: number
    ): Promise<Deposit[]> {
        const instance = this.getDepositTableName(network, pair);

        return this.getAllFromIndex(
            instance,
            'leafIndex',
            lastLeafIndex
                ? IDBKeyRange.lowerBound(lastLeafIndex + 1)
                : undefined
        ) as Promise<Deposit[]>;
    }

    /**
     * getAllEvents
     *
     * @param eventType The event type
     * @param network The current network
     * @param pair The currency/amount pair
     * @returns All the specified instance Tornado events
     */
    // Complex type
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public async getAllEvents(
        eventType: TornadoEvents,
        network: AvailableNetworks,
        pair: CurrencyAmountPair
    ) {
        const instance = this.getStoreInstanceName(eventType, network, pair);

        return this.getAllValues(instance);
    }

    /**
     * createStoreInstances
     *
     * It creates the required store instances
     */
    public async createStoreInstances(): Promise<void> {
        const tables: {
            name: StoreNames<ITornadoEventsDB>;
            keyPath: string;
            indexes: string[];
            autoIncrement?: boolean;
        }[] = [];
        // Create available networks tornado instances tables for deposits and withdrawals events
        for (const network of Object.values(AvailableNetworks)) {
            for (const [currency, amount] of Object.entries(
                CurrencyAmountArray
            )) {
                if (
                    CurrenciesByChain[network as AvailableNetworks].includes(
                        currency as KnownCurrencies
                    )
                ) {
                    amount.forEach((v: any) => {
                        const depositName: DepositsEventsDbKey =
                            `deposits-${network}-${currency}-${v}` as DepositsEventsDbKey;
                        const withdrawalName: WithdrawalsEventsDbKey =
                            `withdrawals-${network}-${currency}-${v}` as WithdrawalsEventsDbKey;
                        tables.push({
                            name: depositName,
                            keyPath: 'leafIndex',
                            indexes: ['leafIndex', 'commitment'],
                        });
                        tables.push({
                            name: withdrawalName,
                            keyPath: 'nullifierHex',
                            indexes: ['nullifierHex'],
                        });
                    });
                }
            }
        }

        // Create LastEvents table
        tables.push({
            name: 'lastEvents',
            keyPath: 'instance',
            indexes: ['instance'],
        });

        return this.createObjectStore(tables);
    }

    /**
     * updateEvents
     *
     * It updates the list of events for the specified instance
     *
     * @param network The current network
     * @param pair The currency/amount pair
     * @param param2 The type/events object
     */
    public async updateEvents(
        network: AvailableNetworks,
        pair: CurrencyAmountPair,
        { type, events }: EventsUpdateType
    ): Promise<void> {
        const instance = this.getStoreInstanceName(type, network, pair);

        return this.putBulkValues(instance, events);
    }

    /**
     * truncateEvents
     *
     * It deletes all the events for the specified instance
     *
     * @param network The current network
     * @param pair The currency/amount pair
     * @param param2 The type/events object
     */
    public async truncateEvents(
        network: AvailableNetworks,
        pair: CurrencyAmountPair,
        { type }: EventsUpdateType
    ): Promise<void> {
        const instance = this.getStoreInstanceName(type, network, pair);

        return this.truncateTable(instance);
    }

    /**
     * getSubsequentDepositsCount
     *
     * It returns the amount of subsequent deposits for the specified instance
     *
     * @param network The current network
     * @param pair The currency/amount pair
     * @param commitmentHex The deposit commitment hex
     * @returns The subsequent deposits count after the specified leaf index
     */
    public async getSubsequentDepositsCount(
        network: AvailableNetworks,
        pair: CurrencyAmountPair,
        commitmentHex: string
    ): Promise<number | undefined> {
        const depEv = await this.getDepositEventByCommitment(
            network as AvailableNetworks,
            pair,
            commitmentHex
        );

        // The deposit is not present in the tree, so we can't find the subsequent deposits
        if (!depEv) {
            return undefined;
        }

        const fromLeafIndex = depEv.leafIndex;
        const lastLeafIndex = await this.getLastLeafIndex(network, pair);

        return lastLeafIndex - fromLeafIndex;
    }
}
