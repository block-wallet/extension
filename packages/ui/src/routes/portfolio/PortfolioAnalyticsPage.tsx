import React, { useState, useEffect } from 'react';
import { MdRefresh } from 'react-icons/md';
import { useBlankState } from '../../context/background/backgroundHooks';
import { useOnMountHistory } from '../../context/hooks/useOnMount';
import { getPortfolioAnalytics, refreshPortfolioAnalytics } from '../../context/commActions';
import AssetAllocationChart from '../../components/portfolio/AssetAllocationChart';
import PopupLayout from '../../components/popup/PopupLayout';
import PopupHeader from '../../components/popup/PopupHeader';
import HorizontalSelect from '../../components/input/HorizontalSelect';

interface PortfolioMetrics {
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

// Compact Overview Tab Component
const OverviewTab: React.FC<{
    metrics: PortfolioMetrics | null;
    currency: string;
    isLoading: boolean;
}> = ({ metrics, currency, isLoading }) => {
    if (isLoading) {
        return (
            <div className="space-y-4 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse"></div>
                    <div className="grid grid-cols-2 gap-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        ))}
                    </div>
                </div>
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4">
            {/* Compact Portfolio Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Portfolio Overview</h2>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white break-words">
                        {metrics ? `${currency.toUpperCase()} ${metrics.totalValue.toLocaleString()}` : '$0.00'}
                    </div>
                </div>

                {/* 2x2 Grid for metrics */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center transition-colors duration-200">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">24h</div>
                        <div className={`text-sm font-semibold ${(metrics?.change24h || 0) > 0 ? 'text-green-500 dark:text-green-400' :
                            (metrics?.change24h || 0) < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                            {metrics?.change24h?.toFixed(2) || '0.00'}%
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center transition-colors duration-200">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">7d</div>
                        <div className={`text-sm font-semibold ${(metrics?.change7d || 0) > 0 ? 'text-green-500 dark:text-green-400' :
                            (metrics?.change7d || 0) < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                            {metrics?.change7d?.toFixed(2) || '0.00'}%
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center transition-colors duration-200">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">30d</div>
                        <div className={`text-sm font-semibold ${(metrics?.change30d || 0) > 0 ? 'text-green-500 dark:text-green-400' :
                            (metrics?.change30d || 0) < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                            {metrics?.change30d?.toFixed(2) || '0.00'}%
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center transition-colors duration-200">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">All Time</div>
                        <div className={`text-sm font-semibold ${(metrics?.changeAllTime || 0) > 0 ? 'text-green-500 dark:text-green-400' :
                            (metrics?.changeAllTime || 0) < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                            {metrics?.changeAllTime?.toFixed(2) || '0.00'}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Diversity Score */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Portfolio Diversity</div>
                <div className="flex items-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white mr-2">
                        {metrics?.diversityScore || 0}/100
                    </div>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${metrics?.diversityScore || 0}%` }}
                        ></div>
                    </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {(metrics?.diversityScore || 0) >= 70 ? 'Well diversified' :
                        (metrics?.diversityScore || 0) >= 40 ? 'Moderately diversified' :
                            'Consider diversifying'}
                </div>
            </div>
        </div>
    );
};

// Compact Allocation Tab Component
const AllocationTab: React.FC<{
    metrics: PortfolioMetrics | null;
    currency: string;
    isLoading: boolean;
}> = ({ metrics, currency, isLoading }) => {
    return (
        <div className="p-4">
            <AssetAllocationChart
                allocation={metrics?.assetAllocation || {}}
                currency={currency}
                isLoading={isLoading}
            />
        </div>
    );
};

// Compact Performance Tab Component
const PerformanceTab: React.FC<{
    metrics: PortfolioMetrics | null;
    currency: string;
    isLoading: boolean;
}> = ({ metrics, currency, isLoading }) => {
    if (isLoading) {
        return (
            <div className="space-y-3 p-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performers (24h)</h3>

                {metrics?.topPerformers && metrics.topPerformers.length > 0 ? (
                    <div className="space-y-2">
                        {metrics.topPerformers.slice(0, 5).map((performer, index) => (
                            <div key={performer.symbol} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                                <div className="flex items-center">
                                    <div className="w-6 h-6 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3">
                                        {index + 1}
                                    </div>
                                    <span className="font-medium text-gray-900 dark:text-white text-sm">{performer.symbol}</span>
                                </div>
                                <div className="text-right">
                                    <div className={`font-semibold text-sm ${performer.change > 0 ? 'text-green-500 dark:text-green-400' :
                                        performer.change < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {performer.change > 0 ? '+' : ''}{(performer.change || 0).toFixed(2)}%
                                    </div>
                                </div>
                            </div>
                        ))}
                        {metrics.topPerformers.length > 5 && (
                            <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
                                +{metrics.topPerformers.length - 5} more assets
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No performance data available
                    </div>
                )}
            </div>
        </div>
    );
};

const portfolioTabs = [
    {
        label: "Overview",
        component: OverviewTab,
    },
    {
        label: "Allocation",
        component: AllocationTab,
    },
    {
        label: "Performance",
        component: PerformanceTab,
    }
];

const PortfolioAnalyticsPage: React.FC = () => {
    const { nativeCurrency } = useBlankState()!;
    const history = useOnMountHistory();
    const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(portfolioTabs[0]);

    const TabComponent = activeTab.component;

    useEffect(() => {
        const loadPortfolioData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const analyticsData = await getPortfolioAnalytics();
                setMetrics(analyticsData);
            } catch (err) {
                console.error('Error loading portfolio analytics:', err);
                setError('Failed to load portfolio data. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        loadPortfolioData();
    }, []);

    const handleRefresh = async () => {
        try {
            setIsLoading(true);
            setError(null);

            await refreshPortfolioAnalytics();
            const analyticsData = await getPortfolioAnalytics();
            setMetrics(analyticsData);
        } catch (err) {
            console.error('Error refreshing portfolio analytics:', err);
            setError('Failed to refresh portfolio data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const onTabChange = (value: { label: string; component: any }) => {
        setActiveTab(value);
    };

    if (error) {
        return (
            <PopupLayout
                header={
                    <PopupHeader
                        title="Portfolio Analytics"
                        onBack={() => history.push("/")}
                    />
                }
            >
                <div className="flex flex-col items-center justify-center h-64 p-6">
                    <div className="text-red-500 dark:text-red-400 text-lg mb-4">{error}</div>
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors duration-200"
                    >
                        Retry
                    </button>
                </div>
            </PopupLayout>
        );
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Portfolio Analytics"
                    onBack={() => history.push("/")}
                >
                    <div className="ml-auto mr-2">
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="p-2 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-gray-700 dark:hover:text-blue-400"
                            title={isLoading ? 'Refreshing...' : 'Refresh portfolio data'}
                        >
                            <MdRefresh
                                className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
                            />
                        </button>
                    </div>
                </PopupHeader>
            }
        >
            <div className="flex flex-col h-full overflow-x-hidden">

                {/* Tab Navigation */}
                <HorizontalSelect
                    options={portfolioTabs}
                    value={activeTab}
                    onChange={onTabChange}
                    display={(t) => t.label}
                    disableStyles
                    optionClassName={(value) =>
                        `flex-1 flex flex-row items-center justify-center p-3 text-sm hover:text-primary-blue-default transition-colors duration-200 ${activeTab === value
                            ? "border-primary-blue-default border-b-2 text-primary-blue-default font-semibold"
                            : "border-primary-grey-hover text-primary-grey-dark border-b hover:text-primary-blue-default font-medium dark:text-gray-300 dark:hover:text-blue-400"
                        }`
                    }
                    containerClassName="flex flex-row border-b border-gray-200 dark:border-gray-700"
                />

                {/* Tab Content */}
                <div className="flex-1 overflow-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900">
                    <TabComponent
                        metrics={metrics}
                        currency={nativeCurrency}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </PopupLayout>
    );
};

export default PortfolioAnalyticsPage;
