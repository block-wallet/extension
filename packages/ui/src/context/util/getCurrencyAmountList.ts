import {
    CurrencyAmountType,
    KnownCurrencies,
} from "@block-wallet/background/controllers/blank-deposit/types"

const CurrencyAmountArray: {
    [ccy in KnownCurrencies]: CurrencyAmountType[ccy][]
} = {
    eth: ["0.1", "1", "10", "100"],
    dai: ["100", "1000", "10000", "100000"],
    cdai: ["5000", "50000", "500000", "5000000"],
    usdc: ["100", "1000"],
    usdt: ["100", "1000"],
    wbtc: ["0.1", "1", "10"],
    matic: ["100", "1000", "10000", "100000"],
    bnb: ["0.1", "1", "10", "100"],
    avax: ["10", "100", "500"],
    xdai: ["100", "1000", "10000", "100000"],
}

export const tokenAddresses = {
    mainnet: [
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    ],
    goerli: [
        "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60",
        "0x822397d9a55d0fefd20F5c4bCaB33C5F65bd28Eb",
        "0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C",
        "0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66",
        "0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05",
    ],
}

export const getCurrencyAmountList = (currency: KnownCurrencies) =>
    CurrencyAmountArray[currency]
