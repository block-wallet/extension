import React, { useState } from 'react';
import { formatCurrency } from '../../util/formatCurrency';

interface AssetAllocationChartProps {
    allocation: {
        [symbol: string]: {
            value: number;
            percentage: number;
        };
    };
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
    const [showAllAssets, setShowAllAssets] = useState(false);

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

    // Compute "Other" to cover the remaining percentage (if any)
    const totalShownPercent = sortedAssets.reduce((sum, [, data]) => sum + data.percentage, 0);
    const otherPercentage = Math.max(0, 100 - totalShownPercent);
    const includeOther = otherPercentage > 0.05; // threshold to show as a wedge

    // Show only top 4 assets by default, with option to expand
    const displayAssets = showAllAssets ? sortedAssets : sortedAssets.slice(0, 4);

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="flex items-center justify-center">
                    <div className="w-40 h-40 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                </div>
                <div className="mt-4 space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (sortedAssets.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">
                    Asset Allocation
                </h3>
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No assets to display
                </div>
            </div>
        );
    }

    let cumulativePercentage = 0;
    const gradientStops = [
        ...sortedAssets.map(([symbol, data], index) => {
            const start = cumulativePercentage;
            cumulativePercentage += data.percentage;
            const end = cumulativePercentage;
            const color = colors[index % colors.length];
            return `${color} ${start}% ${end}%`;
        }),
        ...(includeOther ? (() => {
            const start = cumulativePercentage;
            const end = 100;
            const color = '#9CA3AF'; // gray for Other
            return [`${color} ${start}% ${end}%`];
        })() : []),
    ].join(', ');

    const pieChartStyle = {
        background: `conic-gradient(${gradientStops})`,
    } as React.CSSProperties;

    const handleAssetClick = (symbol: string) => {
        setSelectedAsset(selectedAsset === symbol ? null : symbol);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 overflow-x-hidden">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">
                Asset Allocation
            </h3>

            <div className="flex flex-col items-center space-y-4">
                {/* Compact pie chart */}
                <div
                    className="w-40 h-40 rounded-full border-2 border-white dark:border-gray-700 shadow-lg"
                    style={pieChartStyle}
                ></div>

                {/* Compact asset list */}
                <div className="w-full space-y-2">
                    {displayAssets.map(([symbol, data], index) => (
                        <div
                            key={symbol}
                            className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 cursor-pointer ${hoveredAsset === symbol || selectedAsset === symbol
                                ? 'bg-blue-50 dark:bg-blue-900/30 shadow-sm border border-blue-200 dark:border-blue-700'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                                }`}
                            onMouseEnter={() => setHoveredAsset(symbol)}
                            onMouseLeave={() => setHoveredAsset(null)}
                            onClick={() => handleAssetClick(symbol)}
                        >
                            <div className="flex items-center flex-1 min-w-0">
                                <div
                                    className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                                    style={{ backgroundColor: colors[index % colors.length] }}
                                ></div>
                                <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{symbol}</span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                                <div className="font-bold text-gray-900 dark:text-white text-sm">
                                    {data.percentage.toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 break-all">
                                    {formatCurrency(data.value, { currency })}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Other row */}
                    {includeOther && (
                        <div className="flex items-center justify-between p-3 rounded-lg border border-transparent text-gray-600 dark:text-gray-300">
                            <div className="flex items-center flex-1 min-w-0">
                                <div
                                    className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                                    style={{ backgroundColor: '#9CA3AF' }}
                                ></div>
                                <span className="font-medium text-sm truncate">Other</span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                                <div className="font-bold text-sm">
                                    {otherPercentage.toFixed(1)}%
                                </div>
                                {/* No currency value for Other to avoid double counting */}
                            </div>
                        </div>
                    )}

                    {/* Show more/less toggle */}
                    {sortedAssets.length > 4 && (
                        <button
                            onClick={() => setShowAllAssets(!showAllAssets)}
                            className="w-full text-center py-2 text-sm text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors duration-200"
                        >
                            {showAllAssets
                                ? 'Show Less'
                                : `Show ${sortedAssets.length - 4} More Assets`
                            }
                        </button>
                    )}
                </div>

                {/* Compact summary stats */}
                <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center transition-colors duration-200">
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Assets</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{sortedAssets.length + (includeOther ? 1 : 0)}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center transition-colors duration-200">
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Top Asset</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {sortedAssets[0] ? sortedAssets[0][0] : 'N/A'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetAllocationChart;
