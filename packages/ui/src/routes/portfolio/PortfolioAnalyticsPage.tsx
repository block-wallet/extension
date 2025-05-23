import React, { useState, useEffect } from 'react';
import { useBlankState } from '../../context/background/backgroundHooks';
import { useOnMountHistory } from '../../context/hooks/useOnMount';
import { getPortfolioAnalytics, refreshPortfolioAnalytics } from '../../context/commActions';
import PortfolioMetricsCard from '../../components/portfolio/PortfolioMetricsCard';
import AssetAllocationChart from '../../components/portfolio/AssetAllocationChart';
import PopupLayout from '../../components/popup/PopupLayout';
import PopupHeader from '../../components/popup/PopupHeader';

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

const PortfolioAnalyticsPage: React.FC = () => {
    const { nativeCurrency } = useBlankState()!;
    const history = useOnMountHistory();
    const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                    <div className="text-red-500 text-lg mb-4">{error}</div>
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </PopupLayout>
        );
    }

    if (isLoading) {
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <div className="mt-4 text-gray-600">Loading portfolio analytics...</div>
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
                />
            }
        >
            <div className="flex flex-col space-y-6 p-6">
                <div className="flex justify-end">
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        disabled={isLoading}
                    >
                        Refresh
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="lg:col-span-2">
                        <PortfolioMetricsCard
                            metrics={metrics || {
                                totalValue: 0,
                                change24h: 0,
                                change7d: 0,
                                change30d: 0,
                                changeAllTime: 0,
                                diversityScore: 0,
                            }}
                            currency={nativeCurrency}
                            isLoading={isLoading}
                        />
                    </div>

                    <AssetAllocationChart
                        allocation={metrics?.assetAllocation || {}}
                        currency={nativeCurrency}
                        isLoading={isLoading}
                    />

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Top Performers (24h)
                        </h3>

                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                                ))}
                            </div>
                        ) : metrics?.topPerformers && metrics.topPerformers.length > 0 ? (
                            <div className="space-y-3">
                                {metrics.topPerformers.map((performer, index) => (
                                    <div key={performer.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                                                {index + 1}
                                            </div>
                                            <span className="font-medium text-gray-900">{performer.symbol}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-semibold ${performer.change > 0 ? 'text-green-500' :
                                                performer.change < 0 ? 'text-red-500' : 'text-gray-500'
                                                }`}>
                                                {performer.change > 0 ? '+' : ''}{(performer.change || 0).toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No performance data available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PopupLayout>
    );
};

export default PortfolioAnalyticsPage;
