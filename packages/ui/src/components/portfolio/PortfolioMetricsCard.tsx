import React from 'react';
import { formatCurrency } from '../../util/formatCurrency';

interface PortfolioMetrics {
    totalValue: number;
    change24h: number;
    change7d: number;
    change30d: number;
    changeAllTime: number;
    diversityScore: number;
}

interface PortfolioMetricsCardProps {
    metrics: PortfolioMetrics;
    currency: string;
    isLoading?: boolean;
}

const PortfolioMetricsCard: React.FC<PortfolioMetricsCardProps> = ({
    metrics,
    currency,
    isLoading = false,
}) => {
    const getChangeColor = (change: number) => {
        if (change > 0) return 'text-green-500';
        if (change < 0) return 'text-red-500';
        return 'text-gray-500';
    };

    const getChangeIcon = (change: number) => {
        if (change > 0) return '↗';
        if (change < 0) return '↘';
        return '→';
    };

    const safeToFixed = (value: number | null | undefined, decimals: number = 2): string => {
        if (value === null || value === undefined || isNaN(value)) {
            return '0.00';
        }
        return Number(value).toFixed(decimals);
    };

    const safeValue = (value: number | null | undefined): number => {
        if (value === null || value === undefined || isNaN(value)) {
            return 0;
        }
        return Number(value);
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    const totalValue = safeValue(metrics?.totalValue);
    const change24h = safeValue(metrics?.change24h);
    const change7d = safeValue(metrics?.change7d);
    const change30d = safeValue(metrics?.change30d);
    const changeAllTime = safeValue(metrics?.changeAllTime);
    const diversityScore = safeValue(metrics?.diversityScore);

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Portfolio Overview
                </h2>
                <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(totalValue, { currency })}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">24h Change</div>
                    <div className={`text-lg font-semibold flex items-center ${getChangeColor(change24h)}`}>
                        <span className="mr-1">{getChangeIcon(change24h)}</span>
                        {safeToFixed(change24h)}%
                    </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">7d Change</div>
                    <div className={`text-lg font-semibold flex items-center ${getChangeColor(change7d)}`}>
                        <span className="mr-1">{getChangeIcon(change7d)}</span>
                        {safeToFixed(change7d)}%
                    </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">30d Change</div>
                    <div className={`text-lg font-semibold flex items-center ${getChangeColor(change30d)}`}>
                        <span className="mr-1">{getChangeIcon(change30d)}</span>
                        {safeToFixed(change30d)}%
                    </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">All Time</div>
                    <div className={`text-lg font-semibold flex items-center ${getChangeColor(changeAllTime)}`}>
                        <span className="mr-1">{getChangeIcon(changeAllTime)}</span>
                        {safeToFixed(changeAllTime)}%
                    </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                    <div className="text-sm text-gray-600 mb-1">Portfolio Diversity</div>
                    <div className="flex items-center">
                        <div className="text-lg font-semibold text-gray-900 mr-2">
                            {diversityScore}/100
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${diversityScore}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {diversityScore >= 70 ? 'Well diversified' :
                            diversityScore >= 40 ? 'Moderately diversified' :
                                'Consider diversifying'}
                    </div>
                </div>
            </div >
        </div >
    );
};

export default PortfolioMetricsCard;
