import { BaseController } from '../infrastructure/BaseController';
import { BigNumber } from '@ethersproject/bignumber';
import { AccountTrackerController, AccountTrackerEvents } from './AccountTrackerController';
import { ExchangeRatesController } from './ExchangeRatesController';
import { PreferencesController, PreferencesControllerEvents } from './PreferencesController';
import NetworkController, { NetworkEvents } from './NetworkController';
import { isNativeTokenAddress } from '../utils/token';
import { formatUnits } from '@ethersproject/units';
import log from 'loglevel';

export interface PortfolioSnapshot {
    timestamp: number;
    totalValue: number;
    accountAddress: string;
    chainId: number;
    assets: {
        [tokenAddress: string]: {
            symbol: string;
            balance: string;
            price: number;
            value: number;
            decimals: number;
        };
    };
}

export interface PortfolioMetrics {
    totalValue: number;
    change24h: number;
    change7d: number;
    change30d: number;
    changeAllTime: number;
    assetAllocation: {
        [symbol: string]: {
            value: number;
            percentage: number;
        };
    };
    topPerformers: {
        symbol: string;
        change: number;
        value: number;
    }[];
    diversityScore: number;
}

export interface PortfolioAnalyticsState {
    snapshots: PortfolioSnapshot[];
    lastSnapshotTime: number;
    isTrackingEnabled: boolean;
    retentionDays: number;
}

export enum PortfolioAnalyticsEvents {
    SNAPSHOT_CREATED = 'SNAPSHOT_CREATED',
    METRICS_UPDATED = 'METRICS_UPDATED',
}

export class PortfolioAnalyticsController extends BaseController<PortfolioAnalyticsState> {
    private readonly SNAPSHOT_INTERVAL = 60 * 60 * 1000;
    private readonly DEFAULT_RETENTION_DAYS = 365;
    private readonly MAX_SNAPSHOTS = 8760;
    private cleanupIntervalId?: NodeJS.Timeout;
    private _snapshotInFlight = false;

    constructor(
        private readonly _accountTrackerController: AccountTrackerController,
        private readonly _exchangeRatesController: ExchangeRatesController,
        private readonly _preferencesController: PreferencesController,
        private readonly _networkController: NetworkController,
        initialState: PortfolioAnalyticsState = {
            snapshots: [],
            lastSnapshotTime: 0,
            isTrackingEnabled: true,
            retentionDays: 365,
        }
    ) {
        super(initialState);

        this._accountTrackerController.on(
            AccountTrackerEvents.BALANCE_UPDATED,
            this._onBalanceUpdated.bind(this)
        );

        this._preferencesController.on(
            PreferencesControllerEvents.SELECTED_ACCOUNT_CHANGED,
            this._onAccountChanged.bind(this)
        );

        this._networkController.on(
            NetworkEvents.NETWORK_CHANGE,
            this._onNetworkChanged.bind(this)
        );

        this._scheduleCleanup();
    }

    /**
     * Creates a portfolio snapshot for the current account and network
     */
    public async createSnapshot(): Promise<PortfolioSnapshot | null> {
        try {
            const { isTrackingEnabled } = this.store.getState();
            if (!isTrackingEnabled) {
                return null;
            }
            if (this._snapshotInFlight) {
                return null; // avoid concurrent snapshots
            }
            this._snapshotInFlight = true;

            const accountAddress = this._preferencesController.getSelectedAddress();
            const chainId = this._networkController.network.chainId;
            const tokenRatesByAddress = this._exchangeRatesController.getCurrentTokenRatesByAddress();
            const nativeRate = this._exchangeRatesController.getNativeRate();

            const accountTokens = this._accountTrackerController.getAccountTokens(accountAddress, chainId);
            const nativeBalance = this._accountTrackerController.getAccountNativeTokenBalance(accountAddress, chainId);
            const nativeSymbol = this._networkController.network.nativeCurrency.symbol;
            const nativeDecimals = this._networkController.network.nativeCurrency.decimals;

            const assets: PortfolioSnapshot['assets'] = {};
            let totalValue = 0;

            const nativePrice = nativeRate || 0;
            const nativeValueNum = parseFloat(formatUnits(nativeBalance, nativeDecimals)) * nativePrice;

            assets['native'] = {
                symbol: nativeSymbol,
                balance: nativeBalance.toString(),
                price: nativePrice,
                value: nativeValueNum,
                decimals: nativeDecimals,
            };
            totalValue += nativeValueNum;

            Object.entries(accountTokens).forEach(([tokenAddress, { token, balance }]) => {
                if (!isNativeTokenAddress(tokenAddress)) {
                    const price = tokenRatesByAddress[tokenAddress.toLowerCase()] || 0;
                    const valueNum = parseFloat(formatUnits(balance, token.decimals)) * price;

                    assets[tokenAddress] = {
                        symbol: token.symbol,
                        balance: balance.toString(),
                        price,
                        value: valueNum,
                        decimals: token.decimals,
                    };
                    totalValue += valueNum;
                }
            });

            const snapshot: PortfolioSnapshot = {
                timestamp: Date.now(),
                totalValue,
                accountAddress,
                chainId,
                assets,
            };

            this._addSnapshot(snapshot);
            this.emit(PortfolioAnalyticsEvents.SNAPSHOT_CREATED, snapshot);

            return snapshot;
        } catch (error) {
            log.error('Error creating portfolio snapshot:', error);
            return null;
        } finally {
            this._snapshotInFlight = false;
        }
    }

    /**
     * Calculates portfolio metrics based on historical snapshots
     */
    public calculateMetrics(): PortfolioMetrics {
        const { snapshots } = this.store.getState();
        const accountAddress = this._preferencesController.getSelectedAddress();
        const chainId = this._networkController.network.chainId;

        const relevantSnapshots = snapshots
            .filter(s => s.accountAddress.toLowerCase() === accountAddress.toLowerCase() && s.chainId === chainId)
            .sort((a, b) => a.timestamp - b.timestamp);

        if (relevantSnapshots.length === 0) {
            return this._getEmptyMetrics();
        }

        const latestSnapshot = relevantSnapshots[relevantSnapshots.length - 1];
        const currentValue = latestSnapshot.totalValue;

        const hasMeaningful = currentValue >= 0.01;

        const now = Date.now();
        const change24h = this._calculateChangeFrom(relevantSnapshots, now - 24 * 60 * 60 * 1000, currentValue);
        const change7d = this._calculateChangeFrom(relevantSnapshots, now - 7 * 24 * 60 * 60 * 1000, currentValue);
        const change30d = this._calculateChangeFrom(relevantSnapshots, now - 30 * 24 * 60 * 60 * 1000, currentValue);

        let changeAllTime = 0;
        if (relevantSnapshots.length > 1) {
            const firstValue = relevantSnapshots[0].totalValue;
            if (firstValue > 0) {
                changeAllTime = ((currentValue - firstValue) / firstValue) * 100;
            } else if (currentValue > 0 && firstValue === 0) {
                changeAllTime = 999.99;
            }
        }

        // Aggregate allocation by symbol for display, but compute using address-based values
        const allocationBySymbol: PortfolioMetrics['assetAllocation'] = {};
        if (hasMeaningful) {
            Object.values(latestSnapshot.assets).forEach((asset) => {
                if (asset.value >= 0.001) {
                    const percentage = (asset.value / currentValue) * 100;
                    const prev = allocationBySymbol[asset.symbol] || { value: 0, percentage: 0 };
                    allocationBySymbol[asset.symbol] = {
                        value: prev.value + asset.value,
                        percentage: prev.percentage + percentage,
                    };
                }
            });
        }

        const topPerformers = hasMeaningful ? this._calculateTopPerformers24h(relevantSnapshots) : [];

        const diversityScore = this._calculateDiversityScore(allocationBySymbol, hasMeaningful);

        const metrics: PortfolioMetrics = {
            totalValue: currentValue,
            change24h,
            change7d,
            change30d,
            changeAllTime,
            assetAllocation: allocationBySymbol,
            topPerformers,
            diversityScore,
        };
        this.emit(PortfolioAnalyticsEvents.METRICS_UPDATED, metrics);
        return metrics;
    }

    /**
     * Gets snapshots for a specific time range
     */
    public getSnapshotsInRange(startTime: number, endTime: number): PortfolioSnapshot[] {
        const { snapshots } = this.store.getState();
        const accountAddress = this._preferencesController.getSelectedAddress();
        const chainId = this._networkController.network.chainId;

        return snapshots
            .filter(s =>
                s.accountAddress.toLowerCase() === accountAddress.toLowerCase() &&
                s.chainId === chainId &&
                s.timestamp >= startTime &&
                s.timestamp <= endTime
            )
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Enables or disables portfolio tracking
     */
    public setTrackingEnabled(enabled: boolean): void {
        this.store.updateState({ isTrackingEnabled: enabled });
    }

    /**
     * Sets the retention period for snapshots
     */
    public setRetentionDays(days: number): void {
        this.store.updateState({ retentionDays: days });
        this._cleanupOldSnapshots();
    }

    /**
     * Clears all snapshots
     */
    public clearSnapshots(): void {
        this.store.updateState({ snapshots: [], lastSnapshotTime: 0 });
    }

    private _addSnapshot(snapshot: PortfolioSnapshot): void {
        const { snapshots } = this.store.getState();
        const newSnapshots = [...snapshots, snapshot];

        if (newSnapshots.length > this.MAX_SNAPSHOTS) {
            newSnapshots.splice(0, newSnapshots.length - this.MAX_SNAPSHOTS);
        }

        this.store.updateState({
            snapshots: newSnapshots,
            lastSnapshotTime: snapshot.timestamp,
        });
    }

    private _onBalanceUpdated(): void {
        const { lastSnapshotTime } = this.store.getState();
        const now = Date.now();

        if (now - lastSnapshotTime >= this.SNAPSHOT_INTERVAL) {
            this.createSnapshot();
        }
    }

    private _onAccountChanged(): void {
        this.createSnapshot();
    }

    private _onNetworkChanged(): void {
        this.createSnapshot();
    }

    // Calculates percentage change using the latest snapshot at or before targetTime
    private _calculateChangeFrom(snapshots: PortfolioSnapshot[], targetTime: number, currentValue: number): number {
        if (snapshots.length === 0) return 0;
        // Find the last snapshot at or before targetTime; if none, return 0
        let candidate: PortfolioSnapshot | undefined;
        for (let i = snapshots.length - 1; i >= 0; i--) {
            if (snapshots[i].timestamp <= targetTime) {
                candidate = snapshots[i];
                break;
            }
        }
        if (!candidate) return 0;
        if (candidate.totalValue === 0) return 0;
        return ((currentValue - candidate.totalValue) / candidate.totalValue) * 100;
    }

    // Calculates top performers over ~24h window if baseline exists, else falls back to last two snapshots
    private _calculateTopPerformers24h(snapshots: PortfolioSnapshot[]): PortfolioMetrics['topPerformers'] {
        if (snapshots.length < 2) return [];
        const latest = snapshots[snapshots.length - 1];
        const now = latest.timestamp;
        const target = now - 24 * 60 * 60 * 1000;

        // Find baseline snapshot at or before target time
        let baselineIdx = -1;
        for (let i = snapshots.length - 2; i >= 0; i--) {
            if (snapshots[i].timestamp <= target) {
                baselineIdx = i;
                break;
            }
        }
        const previous = baselineIdx >= 0 ? snapshots[baselineIdx] : snapshots[snapshots.length - 2];

        const performers: { symbol: string; change: number; value: number }[] = [];
        Object.entries(latest.assets).forEach(([address, latestAsset]) => {
            const previousAsset = previous.assets[address];
            if (previousAsset && previousAsset.value > 0) {
                const change = ((latestAsset.value - previousAsset.value) / previousAsset.value) * 100;
                performers.push({
                    symbol: latestAsset.symbol,
                    change,
                    value: latestAsset.value,
                });
            }
        });

        return performers
            .sort((a, b) => b.change - a.change)
            .slice(0, 5);
    }

    private _calculateDiversityScore(allocation: PortfolioMetrics['assetAllocation'], hasMeaningful: boolean): number {
        const percentages = Object.values(allocation).map(a => a.percentage / 100);
        const hhi = percentages.reduce((sum, p) => sum + p * p, 0);

        const diversityScore = Math.round((1 - hhi) * 100);

        return hasMeaningful ? diversityScore : 0;
    }

    private _getEmptyMetrics(): PortfolioMetrics {
        return {
            totalValue: 0,
            change24h: 0,
            change7d: 0,
            change30d: 0,
            changeAllTime: 0,
            assetAllocation: {},
            topPerformers: [],
            diversityScore: 0,
        };
    }

    private _cleanupOldSnapshots(): void {
        const { snapshots, retentionDays } = this.store.getState();
        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

        const filteredSnapshots = snapshots.filter(s => s.timestamp >= cutoffTime);

        if (filteredSnapshots.length !== snapshots.length) {
            this.store.updateState({ snapshots: filteredSnapshots });
        }
    }

    private _scheduleCleanup(): void {
        this.cleanupIntervalId = setInterval(() => {
            this._cleanupOldSnapshots();
        }, 24 * 60 * 60 * 1000);
    }

    /**
     * Destroys the controller and cleans up resources
     */
    public destroy(): void {
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = undefined;
        }
    }

    /**
     * Gets current portfolio analytics data
     */
    public getAnalytics(): PortfolioMetrics {
        return this.calculateMetrics();
    }

    /**
     * Refreshes portfolio analytics by creating a new snapshot
     */
    public async refreshAnalytics(): Promise<void> {
        await this.createSnapshot();
    }
}
