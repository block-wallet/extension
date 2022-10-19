import { Network } from "@block-wallet/background/utils/constants/networks"
import { EnoughNativeTokensToSend } from "../../context/hooks/useSelectedAccountHasEnoughNativeTokensToSend"
import { getBridgeWarningMessages } from "../bridgeUtils"

describe("Bridge Utils tests", () => {
    const enabledNetwork: Network = {
        name: "custom_name",
        desc: "custom_desc",
        chainId: 11,
        networkVersion: "11",
        nativeCurrency: {
            name: "name",
            symbol: "symbol",
            decimals: 18,
        },
        enable: true,
        test: false,
        order: 1,
        features: [],
        ens: true,
        showGasLevels: true,
        rpcUrls: [],
        actionsTimeIntervals: {
            blockNumberPull: 10,
            balanceFetch: 30,
            gasPricesUpdate: 8,
            exchangeRatesFetch: 1,
            transactionsStatusesUpdate: 8,
            providerSubscriptionsUpdate: 8,
            transactionWatcherUpdate: 45,
        },

        nativelySupported: true,
    }

    const disabledNetwork = { ...enabledNetwork, enable: false }

    describe("getBridgeWarningMessages", () => {
        it("Should return undefined because there's enough native tokens", () => {
            expect(
                getBridgeWarningMessages(
                    EnoughNativeTokensToSend.ENOUGH,
                    undefined
                )
            ).toBeUndefined()
            expect(
                getBridgeWarningMessages(
                    EnoughNativeTokensToSend.ENOUGH,
                    enabledNetwork
                )
            ).toBeUndefined()
            expect(
                getBridgeWarningMessages(
                    EnoughNativeTokensToSend.ENOUGH,
                    disabledNetwork
                )
            ).toBeUndefined()
        })
        it("Should return that the funds may get stuck", () => {
            const stuckMessage = getBridgeWarningMessages(
                EnoughNativeTokensToSend.NOT_ENOUGH,
                undefined
            )
            expect(stuckMessage).not.toBeUndefined()
            expect(stuckMessage?.title).toContain("get stuck")
            expect(stuckMessage?.body).toContain("the destination network")
            expect(stuckMessage?.body).toContain("native token")
            const stuckMessage2 = getBridgeWarningMessages(
                EnoughNativeTokensToSend.NOT_ENOUGH,
                enabledNetwork
            )
            expect(stuckMessage2).not.toBeUndefined()
            expect(stuckMessage2?.title).toContain("get stuck")
            expect(stuckMessage2?.body).toContain(enabledNetwork.desc)
            expect(stuckMessage2?.body).toContain(
                enabledNetwork.nativeCurrency.symbol
            )
        })
        it("Should return that the destination network was not detected", () => {
            const undetectedMessage = getBridgeWarningMessages(
                EnoughNativeTokensToSend.UNKNOWN,
                undefined
            )
            expect(undetectedMessage).not.toBeUndefined()
            expect(undetectedMessage?.title).toContain("not detected")
            expect(undetectedMessage?.body).toContain("the destination network")

            const undetectedMessage2 = getBridgeWarningMessages(
                EnoughNativeTokensToSend.UNKNOWN,
                disabledNetwork
            )
            expect(undetectedMessage2).not.toBeUndefined()
            expect(undetectedMessage?.title).toContain("not detected")
            expect(undetectedMessage2?.body).toContain(
                "the destination network"
            )
        })
        it("Should return that the gas prices are unavailable", () => {
            const undetectedMessage = getBridgeWarningMessages(
                EnoughNativeTokensToSend.UNKNOWN,
                enabledNetwork
            )
            expect(undetectedMessage).not.toBeUndefined()
            expect(undetectedMessage?.title).toContain("unavailable")
            expect(undetectedMessage?.body).toContain("external issues")
        })
    })
})
