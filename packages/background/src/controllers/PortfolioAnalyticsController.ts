import { BaseController } from '../infrastructure/BaseController';
import { BigNumber } from '@ethersproject/bignumber';
import { AccountTrackerController, AccountTrackerEvents } from './AccountTrackerController';
import { ExchangeRatesController } from './ExchangeRatesController';
import { PreferencesController, PreferencesControllerEvents } from './PreferencesController';
import NetworkController, { NetworkEvents } from './NetworkController';
import { isNativeTokenAddress } from '../utils/token';
import { formatUnits } from '@ethersproject/units';
import log from 'loglevel';

export type PortfolioScope = 'SELECTED_ACCOUNT' | 'ALL_ACCOUNTS_CURRENT_CHAIN';

export interface PortfolioSnapshot {
    timestamp: number;
    totalValue: number;
    accountAddress: string; // for ALL_ACCOUNTS, this will be 'ALL'
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
    recentHourlyDays: number; // keep hourly snapshots for this many days; older will be daily rollups
    scope: PortfolioScope;
}

export enum PortfolioAnalyticsEvents {
    SNAPSHOT_CREATED = 'SNAPSHOT_CREATED',
    METRICS_UPDATED = 'METRICS_UPDATED',
}

export class PortfolioAnalyticsController extends BaseController<PortfolioAnalyticsState> {
    private readonly SNAPSHOT_INTERVAL = 60 * 60 * 1000;
    private readonly DEFAULT_RETENTION_DAYS = 365;
    private readonly DEFAULT_RECENT_HOURLY_DAYS = 14;
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
            recentHourlyDays: 14,
            scope: 'SELECTED_ACCOUNT',
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

    /** Public configuration setters **/
    public setScope(scope: PortfolioScope) {
        this.store.updateState({ scope });
    }
    public setRetentionConfig({ retentionDays, recentHourlyDays }: { retentionDays?: number; recentHourlyDays?: number }) {
        const next: Partial<PortfolioAnalyticsState> = {};
        if (typeof retentionDays === 'number') next.retentionDays = retentionDays;
        if (typeof recentHourlyDays === 'number') next.recentHourlyDays = recentHourlyDays;
        this.store.updateState(next as PortfolioAnalyticsState);
        this._cleanupOldSnapshots();
    }

    /**
     * Creates a portfolio snapshot for current config
     */
    public async createSnapshot(): Promise<PortfolioSnapshot | null> {
        try {
            const { isTrackingEnabled, scope } = this.store.getState();
            if (!isTrackingEnabled) return null;
            if (this._snapshotInFlight) return null;
            this._snapshotInFlight = true;

            const chainId = this._networkController.network.chainId;
            const nativeSymbol = this._networkController.network.nativeCurrency.symbol;
            const nativeDecimals = this._networkController.network.nativeCurrency.decimals;

            let accountAddresses: string[] = [];
            if (scope === 'SELECTED_ACCOUNT') {
                accountAddresses = [this._preferencesController.getSelectedAddress()];
            } else {
                accountAddresses = this._accountTrackerController.getAllAccountAddresses();
            }

            // Collect token addresses across accounts on this chain to prefetch rates
            const tokenAddressSet = new Set<string>();
            const nativeBalances: BigNumber[] = [];
            const nativeRate = this._exchangeRatesController.getNativeRate();
            let totalValue = 0;
            const assets: PortfolioSnapshot['assets'] = {};

            // Walk all accounts to aggregate
            for (const acct of accountAddresses) {
                const tokens = this._accountTrackerController.getAccountTokens(acct, chainId);
                const nativeBal = this._accountTrackerController.getAccountNativeTokenBalance(acct, chainId);
                nativeBalances.push(nativeBal);
                Object.keys(tokens).forEach((addr) => {
                    if (!isNativeTokenAddress(addr)) tokenAddressSet.add(addr.toLowerCase());
                });
            }

            // Prefetch token rates
            let tokenRatesByAddr = this._exchangeRatesController.getCurrentTokenRatesByAddress();
            const missing = Array.from(tokenAddressSet).filter((a) => tokenRatesByAddr[a] === undefined);
            if (missing.length > 0) {
                const fetched = await this._exchangeRatesController.getRatesForTokenAddresses(missing);
                tokenRatesByAddr = { ...tokenRatesByAddr, ...fetched };
            }

            // Aggregate native value
            const nativePrice = nativeRate || 0;
            const totalNativeValue = nativeBalances.reduce((sum, bal) => sum + parseFloat(formatUnits(bal, nativeDecimals)) * nativePrice, 0);
            if (totalNativeValue) {
                // Represent aggregated native as one line
                assets['native'] = {
                    symbol: nativeSymbol,
                    balance: nativeBalances.reduce((s, b) => BigNumber.from(s).add(b).toString(), '0'),
                    price: nativePrice,
                    value: totalNativeValue,
                    decimals: nativeDecimals,
                };
            }
            totalValue += totalNativeValue;

            // Aggregate tokens by address across accounts
            const tokenValueAcc: { [addr: string]: { symbol: string; balance: BigNumber; decimals: number; price: number; } } = {};
            for (const acct of accountAddresses) {
                const tokens = this._accountTrackerController.getAccountTokens(acct, chainId);
                Object.entries(tokens).forEach(([tokenAddress, { token, balance }]) => {
                    if (isNativeTokenAddress(tokenAddress)) return;
                    const addr = tokenAddress.toLowerCase();
                    const price = tokenRatesByAddr[addr] || 0;
                    if (!tokenValueAcc[addr]) {
                        tokenValueAcc[addr] = { symbol: token.symbol, balance: BigNumber.from(0), decimals: token.decimals, price };
                    }
                    tokenValueAcc[addr].balance = tokenValueAcc[addr].balance.add(balance);
                });
            }
            Object.entries(tokenValueAcc).forEach(([addr, info]) => {
                const valueNum = parseFloat(formatUnits(info.balance, info.decimals)) * (info.price || 0);
                assets[addr] = {
                    symbol: info.symbol,
                    balance: info.balance.toString(),
                    price: info.price || 0,
                    value: valueNum,
                    decimals: info.decimals,
                };
                totalValue += valueNum;
            });

            const snapshot: PortfolioSnapshot = {
                timestamp: Date.now(),
                totalValue,
                accountAddress: scope === 'SELECTED_ACCOUNT' ? this._preferencesController.getSelectedAddress() : 'ALL',
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
        const { snapshots, scope } = this.store.getState();
        const accountAddress = this._preferencesController.getSelectedAddress();
        const chainId = this._networkController.network.chainId;

        const acctKey = scope === 'SELECTED_ACCOUNT' ? accountAddress.toLowerCase() : 'all';
        const relevantSnapshots = snapshots
            .filter(s => (scope === 'SELECTED_ACCOUNT' ? s.accountAddress.toLowerCase() === acctKey : s.accountAddress === 'ALL') && s.chainId === chainId)
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
        const { snapshots, retentionDays, recentHourlyDays } = this.store.getState();
        const now = Date.now();
        const cutoffTime = now - (retentionDays * 24 * 60 * 60 * 1000);
        const recentHourlyCut = now - (recentHourlyDays * 24 * 60 * 60 * 1000);

        // First, drop anything older than retentionDays
        const filtered = snapshots.filter(s => s.timestamp >= cutoffTime);

        // Then, for entries older than recentHourlyDays, keep only one per day (closest to midday)
        const dailyMap = new Map<string, PortfolioSnapshot>();
        const result: PortfolioSnapshot[] = [];
        for (const s of filtered) {
            if (s.timestamp >= recentHourlyCut) {
                result.push(s);
            } else {
                const d = new Date(s.timestamp);
                const key = `${s.accountAddress}|${s.chainId}|${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
                const current = dailyMap.get(key);
                if (!current) {
                    dailyMap.set(key, s);
                } else {
                    // keep the one closer to 12:00 UTC
                    const noon = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0);
                    const curDiff = Math.abs(current.timestamp - noon);
                    const newDiff = Math.abs(s.timestamp - noon);
                    if (newDiff < curDiff) dailyMap.set(key, s);
                }
            }
        }
        // Append daily
        dailyMap.forEach((snap) => result.push(snap));
        // Sort by time again
        result.sort((a, b) => a.timestamp - b.timestamp);

        if (result.length !== snapshots.length) {
            this.store.updateState({ snapshots: result });
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
