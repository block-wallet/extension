import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { Currency } from "@block-wallet/background/utils/currency"
import httpClient from "./http"
import { toChecksumAddress } from "ethereumjs-util"

interface OnRamperToken {
    address: string
    code: string
    icon: string
    id: string
    name: string
    network: string
    symbol: string
    decimals: number
}

interface APIResponse {
    message: {
        crypto: OnRamperToken[]
        fiat: Currency[]
    }
}

interface OnRamperCurrencies {
    crypto: Token[]
    fiat: Currency[]
}

export const ONRAMPER_API_KEY = "pk_prod_01GYCJHNRP0V65F272K4Z02JY0"

export const getOnRamperCurrencies = async (): Promise<APIResponse> => {
    const onramperAPI = "https://api.onramper.com/supported"
    return await httpClient.request<APIResponse>(onramperAPI, {
        headers: { Authorization: ONRAMPER_API_KEY },
    })
}

export const getOnRamperCurrenciesByNetwork = async (
    currentNetworkName: string
): Promise<OnRamperCurrencies> => {
    const apiCurrencies = await getOnRamperCurrencies()
    const response: OnRamperCurrencies = { crypto: [], fiat: [] }

    apiCurrencies.message.crypto.map((token) => {
        if (
            token.network.toLowerCase() === currentNetworkName.toLowerCase() &&
            token.address
        ) {
            response.crypto.push({
                name: token.name,
                address: token.address,
                symbol: token.code,
                logo:
                    "https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/" +
                    currentNetworkName.toLowerCase() +
                    "/assets/" +
                    toChecksumAddress(token.address) +
                    "/logo.png",
                decimals: token.decimals,
                type: "",
            })
        }

        return true
    })

    response.fiat.push(...apiCurrencies.message.fiat)

    return response
}
