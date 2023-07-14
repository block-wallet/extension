import { BigNumber } from "@ethersproject/bignumber"

export const SEND_GAS_COST = BigNumber.from("0x5208") // Hex for 21000, cost of a simple send.
export const APPROVE_GAS_COST = BigNumber.from("0xcb34") // Hex for 52020, default cost of approve.

/**
 * Decimal places to default in case an error looking up for them occurred
 */
export const DEFAULT_DECIMALS = 18

/**
 * Percentage of the estimated gas to define a lower and higher threshold to calculate a gas warning
 */
export const DEFAULT_TRANSACTION_GAS_PERCENTAGE_THRESHOLD = 20

/**
 * Time before transitioning to next DApp request
 */
export const DAPP_FEEDBACK_WINDOW_TIMEOUT = 3000

/**
 * Timeout before cancelling a signing request
 */
export const SIGN_TRANSACTION_TIMEOUT = 180000

/**
 * Default swap fee for users without fee discount
 */
export const BASE_SWAP_FEE = 0.5

/**
 * Default bridge fee for users without fee discount
 */
export const BASE_BRIDGE_FEE = 0.005

/**
 * Time ellapsed before refreshing the swap quote
 */
export const SWAP_QUOTE_REFRESH_TIMEOUT = 1000 * 15

export const LINKS = {
    WEBSITE: "https://blockwallet.io/",
    TELEGRAM: "https://t.me/blockwallet",
    DISCORD: "https://discord.gg/blockwallet",
    GITHUB: "https://github.com/block-wallet/",
    TWITTER: "https://twitter.com/GetBlockWallet",
    WEBSITE_BUG_REPORT: "https://blockwallet.io/bug-report.html",
    GITHUB_BUG_REPORT:
        "https://github.com/block-wallet/extension/issues/new?assignees=&labels=&template=bug_report.md&title=",
    ARTICLES: {
        HD_PATH:
            "https://blockwallet.io/docs/what-is-an-hd-path",
        LOCK_TIMEOUT:
            "https://blockwallet.io/docs/what-is-lock-timeout",
        CUSTOM_NETWORK_RISKS:
            "https://blockwallet.io/docs/add-a-network-or-custom-rpc",
        MALICIOUS_DAPPS:
            "https://blockwallet.io/docs/stay-safe-when-connecting-to-dapps",
        BRIDGES: "https://blockwallet.io/docs/bridge-tokens-using-block-wallet",
        CHANGELOG: "https://bit.ly/bw-release",
    },
}

/**
 * Time ellapsed before refreshing the gas prices
 */
export const GAS_PRICE_UPDATE_INTERVAL = 10000 // 10s
