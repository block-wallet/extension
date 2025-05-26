import React, { useState } from 'react';
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
    const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

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
                <div className="h-7 bg-gray-200 rounded mb-6"></div>
                <div className="flex items-center justify-center">
                    <div className="w-56 h-56 bg-gray-200 rounded-full"></div>
                </div>
                <div className="mt-6 space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-6 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (sortedAssets.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                    Asset Allocation
                </h3>
                <div className="text-center py-12 text-gray-500 text-lg">
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

    const handleAssetClick = (symbol: string) => {
        setSelectedAsset(selectedAsset === symbol ? null : symbol);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                Asset Allocation
            </h3>

            <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="flex-shrink-0">
                    <div
                        className="w-56 h-56 rounded-full border-4 border-white shadow-lg transform transition-transform duration-200 hover:scale-105"
                        style={pieChartStyle}
                    ></div>
                </div>

                <div className="flex-1 space-y-3 w-full">
                    {sortedAssets.map(([symbol, data], index) => (
                        <div
                            key={symbol}
                            className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 cursor-pointer ${hoveredAsset === symbol || selectedAsset === symbol
                                ? 'bg-blue-50 shadow-md transform scale-102'
                                : 'hover:bg-gray-50'
                                }`}
                            onMouseEnter={() => setHoveredAsset(symbol)}
                            onMouseLeave={() => setHoveredAsset(null)}
                            onClick={() => handleAssetClick(symbol)}
                        >
                            <div className="flex items-center">
                                <div
                                    className={`w-5 h-5 rounded-full mr-4 transition-all duration-200 ${hoveredAsset === symbol || selectedAsset === symbol
                                        ? 'scale-125 shadow-lg'
                                        : ''
                                        }`}
                                    style={{ backgroundColor: colors[index % colors.length] }}
                                ></div>
                                <span className="font-semibold text-gray-900 text-lg">{symbol}</span>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-gray-900 text-lg">
                                    {data.percentage.toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-600 font-medium">
                                    {formatCurrency(data.value, { currency })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-600 mb-1">Total Assets</div>
                        <div className="text-xl font-bold text-gray-900">{sortedAssets.length}</div>
                        <div className="text-xs text-gray-500">tokens</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-600 mb-1">Largest Holding</div>
                        <div className="text-xl font-bold text-gray-900">
                            {sortedAssets[0] ? sortedAssets[0][0] : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                            {sortedAssets[0] ? `${sortedAssets[0][1].percentage.toFixed(1)}%` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetAllocationChart;
