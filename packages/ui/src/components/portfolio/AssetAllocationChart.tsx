import React from 'react';
import { formatCurrency } from '../../util/formatCurrency';

interface AssetAllocation {
    [symbol: string]: {
        value: number;
        percentage: number;
    };
}

interface AssetAllocationChartProps {
    allocation: AssetAllocation;
    currency: string;
    isLoading?: boolean;
}

const AssetAllocationChart: React.FC<AssetAllocationChartProps> = ({
    allocation,
    currency,
    isLoading = false,
}) => {
    const colors = [
        '#3B82F6',
        '#10B981',
        '#F59E0B',
        '#EF4444',
        '#8B5CF6',
        '#06B6D4',
        '#84CC16',
        '#F97316',
    ];

    const sortedAssets = Object.entries(allocation)
        .sort(([, a], [, b]) => b.percentage - a.percentage)
        .slice(0, 8);

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="flex items-center justify-center">
                    <div className="w-48 h-48 bg-gray-200 rounded-full"></div>
                </div>
                <div className="mt-4 space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-4 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (sortedAssets.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Asset Allocation
                </h3>
                <div className="text-center py-8 text-gray-500">
                    No assets to display
                </div>
            </div>
        );
    }

    let cumulativePercentage = 0;
    const gradientStops = sortedAssets.map(([symbol, data], index) => {
        const start = cumulativePercentage;
        cumulativePercentage += data.percentage;
        const end = cumulativePercentage;
        const color = colors[index % colors.length];
        return `${color} ${start}% ${end}%`;
    }).join(', ');

    const pieChartStyle = {
        background: `conic-gradient(${gradientStops})`,
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Asset Allocation
            </h3>

            <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                    <div
                        className="w-48 h-48 rounded-full border-4 border-white shadow-lg"
                        style={pieChartStyle}
                    ></div>
                </div>

                <div className="flex-1 space-y-3">
                    {sortedAssets.map(([symbol, data], index) => (
                        <div key={symbol} className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div
                                    className="w-4 h-4 rounded-full mr-3"
                                    style={{ backgroundColor: colors[index % colors.length] }}
                                ></div>
                                <span className="font-medium text-gray-900">{symbol}</span>
                            </div>
                            <div className="text-right">
                                <div className="font-semibold text-gray-900">
                                    {data.percentage.toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-500">
                                    {formatCurrency(data.value, { currency })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-600">
                    <span>Total Assets</span>
                    <span>{sortedAssets.length} tokens</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>Largest Holding</span>
                    <span>
                        {sortedAssets[0] ? `${sortedAssets[0][0]} (${sortedAssets[0][1].percentage.toFixed(1)}%)` : 'N/A'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AssetAllocationChart;
