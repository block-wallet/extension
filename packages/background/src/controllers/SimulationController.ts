import { StaticJsonRpcProvider } from '@ethersproject/providers'
import NetworkController from './NetworkController'
import { TransactionRequest } from '../utils/types/ethereum'

export interface SimulationResult {
    success: boolean
    errorMessage?: string
    revertReason?: string
}

/**
 * Minimal transaction simulation controller.
 * Phase 1: uses eth_call to detect reverts and report reason when available.
 * Further phases can add decoding of logs/transfers via trace APIs or external services.
 */
export default class SimulationController {
    private readonly _networkController: NetworkController

    constructor(networkController: NetworkController) {
        this._networkController = networkController
    }

    private get provider(): StaticJsonRpcProvider {
        return this._networkController.getProvider()
    }

    public async simulateTransaction(
        tx: TransactionRequest
    ): Promise<SimulationResult> {
        try {
            // Use call to simulate execution without broadcasting
            await this.provider.call({
                to: tx.to,
                from: tx.from,
                data: tx.data,
                value: tx.value,
                gasLimit: tx.gasLimit,
                gasPrice: tx.gasPrice,
            } as any)

            return { success: true }
        } catch (err: any) {
            // Try to extract meaningful revert reason
            const revertReason = this.extractRevertReason(err)
            const message = err?.message || 'Simulation failed'
            return { success: false, errorMessage: message, revertReason }
        }
    }

    private extractRevertReason(error: any): string | undefined {
        try {
            // Ethers often nests the reason under error.error.message
            if (error?.error?.message) return String(error.error.message)
            if (error?.reason) return String(error.reason)
            if (error?.data?.message) return String(error.data.message)
            if (error?.body) {
                const parsed = JSON.parse(error.body)
                if (parsed?.error?.message) return String(parsed.error.message)
            }
        } catch {
            // ignore
        }
        return undefined
    }
}


