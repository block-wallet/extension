import React from "react"
import { SimulationResult } from "@block-wallet/background/controllers/SimulationController"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { Rates } from "@block-wallet/background/controllers/ExchangeRatesController"
import { toCurrencyAmount, formatCurrency } from "../../util/formatCurrency"
import { createEtherBigNumber, createTokenBigNumber } from "../../util/bigNumberUtils"

interface SwapSimulationDisplayProps {
    simulation?: SimulationResult
    simulationError?: string
    fromToken: Token
    toToken: Token
    nativeToken: Token
    exchangeRates: Rates
    selectedAccountAddress: string
}

const SwapSimulationDisplay: React.FC<SwapSimulationDisplayProps> = ({
    simulation,
    simulationError,
    fromToken,
    toToken,
    nativeToken,
    exchangeRates,
    selectedAccountAddress
}) => {
    const renderSimulationError = () => (
        <p className="text-[12px] text-center text-red-600 dark:text-red-400">
            Simulation failed: {simulationError}
        </p>
    )

    const renderSimulationSuccess = () => (
        <p className="text-[12px] text-center text-gray-500 dark:text-gray-400">
            Simulation passed
        </p>
    )

    const calculateNetUsdDelta = (): number => {
        if (!simulation?.success) return 0

        let usdDelta = 0

        if (simulation.nativeBalanceDelta && nativeToken) {
            const rate = exchangeRates[nativeToken.symbol]
            if (rate) {
                const amount = createEtherBigNumber(
                    simulation.nativeBalanceDelta.startsWith('-')
                        ? simulation.nativeBalanceDelta.slice(1)
                        : simulation.nativeBalanceDelta
                )
                const sign = simulation.nativeBalanceDelta.startsWith('-') ? -1 : 1
                usdDelta += sign * toCurrencyAmount(amount, rate, nativeToken.decimals)
            }
        }

        if (simulation.erc20Transfers?.length) {
            simulation.erc20Transfers.slice(0, 6).forEach(transfer => {
                const symbol = getTokenSymbol(transfer.token)
                const decimals = getTokenDecimals(transfer.token)

                if (symbol && typeof decimals === 'number') {
                    const rate = exchangeRates[symbol]
                    if (rate) {
                        const value = createTokenBigNumber(transfer.value, decimals)
                        const isToUser = transfer.to?.toLowerCase() === selectedAccountAddress.toLowerCase()
                        const isFromUser = transfer.from?.toLowerCase() === selectedAccountAddress.toLowerCase()

                        if (isToUser || isFromUser) {
                            const delta = toCurrencyAmount(value, rate, decimals) * (isToUser ? 1 : -1)
                            usdDelta += delta
                        }
                    }
                }
            })
        }

        return usdDelta
    }

    const getTokenSymbol = (tokenAddress?: string): string | undefined => {
        if (!tokenAddress) return undefined
        if (tokenAddress.toLowerCase() === fromToken.address?.toLowerCase()) {
            return fromToken.symbol
        }
        if (tokenAddress.toLowerCase() === toToken.address?.toLowerCase()) {
            return toToken.symbol
        }
        return undefined
    }

    const getTokenDecimals = (tokenAddress?: string): number | undefined => {
        if (!tokenAddress) return undefined
        if (tokenAddress.toLowerCase() === fromToken.address?.toLowerCase()) {
            return fromToken.decimals
        }
        if (tokenAddress.toLowerCase() === toToken.address?.toLowerCase()) {
            return toToken.decimals
        }
        return undefined
    }

    const renderSimulationDetails = () => {
        if (!simulation?.success) return null

        try {
            const usdDelta = calculateNetUsdDelta()
            const sign = usdDelta >= 0 ? '' : '-'
            const absUsd = Math.abs(usdDelta)

            return (
                <div className="mt-1 text-[12px] text-gray-700 dark:text-gray-300">
                    <div className="text-center font-medium">
                        Net USD delta: {sign}{formatCurrency(absUsd, { showSymbol: true, showCurrency: false })}
                    </div>

                    {simulation.nativeBalanceDelta && simulation.nativeBalanceDelta !== '0' && (
                        <div className="text-center">
                            Native delta: {simulation.nativeBalanceDelta}
                        </div>
                    )}

                    {simulation.erc20Transfers && simulation.erc20Transfers.length > 0 && (
                        <div className="mt-1">
                            <div className="text-center font-medium">Token transfers detected</div>
                            <ul className="max-h-20 overflow-auto text-xs mt-1 space-y-1">
                                {simulation.erc20Transfers.slice(0, 4).map((transfer, idx) => (
                                    <li key={idx} className="text-center break-all">
                                        {transfer.value} @ {transfer.token} → {transfer.to}
                                    </li>
                                ))}
                                {simulation.erc20Transfers.length > 4 && (
                                    <li className="text-center">…</li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            )
        } catch {
            return null
        }
    }

    return (
        <>
            {simulationError ? renderSimulationError() : renderSimulationSuccess()}
            {renderSimulationDetails()}
        </>
    )
}

export default SwapSimulationDisplay
