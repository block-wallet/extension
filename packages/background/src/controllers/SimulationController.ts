import { StaticJsonRpcProvider } from '@ethersproject/providers'
import NetworkController from './NetworkController'
import { TransactionRequest } from '../utils/types/ethereum'

export interface SimulationResult {
    success: boolean
    errorMessage?: string
    revertReason?: string
    nativeBalanceDelta?: string // wei string
    erc20Transfers?: Array<{ token: string; from: string; to: string; value: string }>
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
            await this.provider.call({
                to: tx.to,
                from: tx.from,
                data: tx.data,
                value: tx.value,
                gasLimit: tx.gasLimit,
                gasPrice: tx.gasPrice,
            } as any)
            const enriched = await this.tryTraceCall(tx)
            if (enriched) return { success: true, ...enriched }
            return { success: true }
        } catch (err: any) {
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

    private async tryTraceCall(tx: TransactionRequest): Promise<Partial<SimulationResult> | undefined> {
        try {
            const call: any = {
                from: tx.from,
                to: tx.to,
                data: tx.data,
                value: tx.value?._hex || tx.value,
            }
            const trace = await (this.provider as any).send('debug_traceCall', [call, 'latest', { tracer: 'callTracer' }])
            if (!trace) return undefined

            const transfers: Array<{ token: string; from: string; to: string; value: string }> = []
            let nativeIn = '0'
            let nativeOut = '0'

            const walk = (node: any) => {
                if (!node) return
                try {
                    if (node.value && typeof node.value === 'string') {
                        const v = this.safeHexToDecimal(node.value)
                        if (this.gtZero(v)) {
                            if (node.from?.toLowerCase() === tx.from?.toLowerCase()) nativeOut = this.add(nativeOut, v)
                            if (node.to?.toLowerCase() === tx.from?.toLowerCase()) nativeIn = this.add(nativeIn, v)
                        }
                    }
                } catch (e) { /* ignore */ }

                if (typeof node.input === 'string' && node.input.length >= 10) {
                    const sig = node.input.slice(0, 10)
                    if (sig === '0xa9059cbb' && node.input.length >= 10 + 64 * 2) {
                        const toHex = '0x' + node.input.slice(10 + 24 * 2, 10 + 64 * 2)
                        const valHex = '0x' + node.input.slice(10 + 64 * 2, 10 + 64 * 3)
                        transfers.push({ token: node.to, from: node.from, to: toHex, value: this.safeHexToDecimal(valHex) })
                    }
                    if (sig === '0x23b872dd' && node.input.length >= 10 + 64 * 3 * 2) {
                        const fromHex = '0x' + node.input.slice(10 + 24 * 2, 10 + 64 * 2)
                        const toHex = '0x' + node.input.slice(10 + 64 * 2 + 24 * 2, 10 + 64 * 4)
                        const valHex = '0x' + node.input.slice(10 + 64 * 4, 10 + 64 * 5)
                        transfers.push({ token: node.to, from: fromHex, to: toHex, value: this.safeHexToDecimal(valHex) })
                    }
                }
                if (Array.isArray(node.calls)) node.calls.forEach(walk)
            }

            walk(trace)

            const nativeBalanceDelta = this.sub(nativeIn, nativeOut)
            return { erc20Transfers: transfers, nativeBalanceDelta }
        } catch {
            return undefined
        }
    }

    private add(a: string, b: string): string {
        const res = BigInt(a) + BigInt(b)
        return res.toString()
    }
    private sub(a: string, b: string): string {
        const res = BigInt(a) - BigInt(b)
        return res.toString()
    }
    private gtZero(a: string): boolean {
        try {
            const n = BigInt(a)
            return n > BigInt(0)
        } catch {
            return false
        }
    }
    private safeHexToDecimal(hex: string): string {
        try {
            return BigInt(hex).toString()
        } catch {
            return '0'
        }
    }
}
