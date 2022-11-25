import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import { createCustomExplorerLink } from "@block-wallet/explorer-link"
import { useEffect, useState } from "react"
import { useBlankState } from "../../context/background/backgroundHooks"
import { getSpecificChainDetails } from "../../context/commActions"
import { TransactionCategories } from "../../context/commTypes"

interface ChainExplorerData {
    networkName: string
    blockExplorerUrl?: string
    explorerName?: string
    chainId: number
}

const BRIDGE_TX_CATEGORIES = [
    TransactionCategories.BRIDGE,
    TransactionCategories.INCOMING_BRIDGE,
    TransactionCategories.INCOMING_BRIDGE_REFUND,
]

interface BridgeTxDetails {
    networkName: string
    chainId: number
    explorerLink?: string
    explorerName?: string
}

export interface BridgeTransactionsData {
    sendingTransaction?: BridgeTxDetails
    receivingTransaction?: BridgeTxDetails
}

const useGetBridgeTransactionsData = (
    transaction?: TransactionMeta | Partial<TransactionMeta>
): BridgeTransactionsData | null => {
    const { availableNetworks } = useBlankState()!

    const [bridgeDetails, setBridgeDetails] =
        useState<BridgeTransactionsData | null>(null)

    useEffect(() => {
        async function getChainData(chainId: number) {
            const network = Object.values(availableNetworks).find((network) => {
                return Number(network.chainId) === Number(chainId)
            })
            let chainData: ChainExplorerData | null = null

            if (network) {
                chainData = {
                    networkName: network.desc!,
                    explorerName: network.blockExplorerName,
                    chainId,
                    blockExplorerUrl:
                        network.blockExplorerUrls &&
                        network.blockExplorerUrls.length > 0
                            ? network.blockExplorerUrls[0]
                            : undefined,
                }
            } else {
                const chain = await getSpecificChainDetails(Number(chainId))
                if (chain) {
                    const explorer =
                        chain.explorers && chain.explorers.length > 0
                            ? chain.explorers[0]
                            : undefined
                    chainData = {
                        chainId,
                        networkName: chain.name!,
                        explorerName: explorer?.name,
                        blockExplorerUrl: undefined, //Use txLink in this case.
                    }
                }
            }
            return chainData
        }

        function getBridgeDetails(
            chainData: ChainExplorerData,
            txHash: string,
            txLink: string
        ): BridgeTxDetails {
            return {
                networkName: chainData.networkName,
                chainId: chainData.chainId,
                explorerLink:
                    chainData.blockExplorerUrl && txHash
                        ? createCustomExplorerLink(
                              txHash,
                              chainData.blockExplorerUrl
                          )
                        : txLink,
                explorerName: chainData.explorerName || "Explorer",
            }
        }

        async function fillBridgeDetails() {
            const { bridgeParams } = transaction!
            if (!bridgeParams) {
                return
            }

            const sendingChainData = await getChainData(
                bridgeParams!.fromChainId
            )
            const receivingChainData = await getChainData(
                bridgeParams!.effectiveToChainId ?? bridgeParams!.toChainId
            )

            const bridgeDetails = {
                sendingTransaction: sendingChainData
                    ? getBridgeDetails(
                          sendingChainData,
                          bridgeParams?.sendingTxHash!,
                          bridgeParams?.sendingTxLink!
                      )
                    : undefined,
                receivingTransaction: receivingChainData
                    ? getBridgeDetails(
                          receivingChainData,
                          bridgeParams?.receivingTxHash!,
                          bridgeParams?.receivingTxLink!
                      )
                    : undefined,
            }

            setBridgeDetails(bridgeDetails)
        }

        if (
            transaction &&
            BRIDGE_TX_CATEGORIES.includes(
                transaction.transactionCategory! || ""
            ) &&
            transaction.bridgeParams
        ) {
            fillBridgeDetails()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transaction?.bridgeParams])

    return bridgeDetails
}

export default useGetBridgeTransactionsData
