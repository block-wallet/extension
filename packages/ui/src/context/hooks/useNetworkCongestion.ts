import { useState, useEffect } from 'react';
import { BigNumber } from '@ethersproject/bignumber';
import { useGasPriceData } from './useGasPriceData'; // Adjust path as needed

export type CongestionLevel = 'normal' | 'medium' | 'high' | 'extreme';

/**
 * Hook to determine the current network congestion level based on gas price spreads.
 *
 * @returns {CongestionLevel} The current congestion level.
 */
export const useNetworkCongestion = (): CongestionLevel => {
    const { gasPricesLevels } = useGasPriceData(); // Remove loading destructuring
    const [congestionLevel, setCongestionLevel] = useState<CongestionLevel>('normal');

    useEffect(() => {
        // Check if essential gas price data is available
        if (!gasPricesLevels?.slow?.gasPrice || !gasPricesLevels?.fast?.gasPrice) {
            setCongestionLevel('normal');
            return;
        }

        try {
            const fastPrice = BigNumber.from(gasPricesLevels.fast.gasPrice);
            const slowPrice = BigNumber.from(gasPricesLevels.slow.gasPrice);

            if (slowPrice.isZero()) {
                setCongestionLevel('normal');
                return;
            }

            const ratioCheck = fastPrice.mul(10).div(slowPrice);

            if (ratioCheck.gte(50)) {
                setCongestionLevel('extreme');
            } else if (ratioCheck.gte(30)) {
                setCongestionLevel('high');
            } else if (ratioCheck.gte(20)) {
                setCongestionLevel('medium');
            } else {
                setCongestionLevel('normal');
            }
        } catch (error) {
            console.error("Error calculating congestion:", error);
            setCongestionLevel('normal');
        }

    }, [gasPricesLevels]); // Remove loading from dependency array

    return congestionLevel;
}; 