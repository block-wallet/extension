import { useBlankState } from "../../context/background/backgroundHooks"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import TokenSummary from "../token/TokenSummary"
import PanelButtons from "./PanelButtons"
import useNetWorthBalance from "../../context/hooks/useNetWorthBalance"
import { AiFillInfoCircle } from "react-icons/ai"
import Tooltip from "../label/Tooltip"
import { setUserSettings } from "../../context/commActions"
import Icon, { IconName } from "../ui/Icon"

const HomeBalancePanel = () => {
    const { isNetworkChanging, isUserNetworkOnline, nativeCurrency, settings } =
        useBlankState()!
    const { isSendEnabled, isSwapEnabled, isBridgeEnabled, isOnrampEnabled } =
        useSelectedNetwork()
    const {
        netWorth,
        displayNetWorth,
        nativeTokenBalance,
        nativeTokenBalanceRounded,
        nativeCurrencyAmount,
    } = useNetWorthBalance()

    const disabledActions = !isSendEnabled || !isUserNetworkOnline

    return (
        <>
            <TokenSummary className="p-4">
                <TokenSummary.Balances className="!space-y-0">
                    <TokenSummary.TokenBalance
                        title={displayNetWorth ? netWorth : nativeTokenBalance}
                    >
                        {displayNetWorth ? netWorth : nativeTokenBalanceRounded}
                    </TokenSummary.TokenBalance>

                    <TokenSummary.ExchangeRateBalance className="flex items-center text-xs">
                        <div className="group relative">
                            <a
                                href="https://blockwallet.io/docs/net-worth"
                                target="_blank"
                                rel="noreferrer"
                                className="contents"
                            >
                                <AiFillInfoCircle
                                    size={23}
                                    className="pr-2 text-primary-grey-dark cursor-pointer hover:text-primary-blue-default"
                                />

                                <Tooltip
                                    content={
                                        <div className="flex flex-col font-normal items-start text-xs text-white-500">
                                            <div className="flex flex-row items-end space-x-7">
                                                {displayNetWorth ? (
                                                    <span>
                                                        Your Net Worth is the
                                                        summed{" "}
                                                        {nativeCurrency.toUpperCase()}{" "}
                                                        value
                                                        <br /> of all assets in
                                                        your asset list.{" "}
                                                    </span>
                                                ) : (
                                                    <span>
                                                        Native token balance for{" "}
                                                        <br /> the current
                                                        network.
                                                    </span>
                                                )}{" "}
                                            </div>
                                            <div className="flex flex-row items-end space-x-4">
                                                <span>
                                                    Click on this icon to learn
                                                    more.
                                                </span>{" "}
                                            </div>
                                        </div>
                                    }
                                    className="!-mb-4"
                                />
                            </a>
                        </div>
                        {displayNetWorth ? "Net Worth" : nativeCurrencyAmount}
                        <div
                            title={`Switch to ${
                                displayNetWorth ? "Native Token" : "Net Worth"
                            }`}
                            className="pl-2 text-primary-grey-dark cursor-pointer hover:text-primary-blue-default"
                            onClick={() => {
                                setUserSettings({
                                    ...settings,
                                    displayNetWorth: !displayNetWorth,
                                })
                            }}
                        >
                            <Icon name={IconName.SWITCH} size="sm" />
                        </div>
                    </TokenSummary.ExchangeRateBalance>
                </TokenSummary.Balances>
                <TokenSummary.Actions>
                    <PanelButtons.Send
                        disabled={disabledActions}
                        isLoading={isNetworkChanging}
                    />
                    {isOnrampEnabled && (
                        <PanelButtons.Buy
                            disabled={disabledActions}
                            isLoading={isNetworkChanging}
                        />
                    )}
                    {isSwapEnabled && (
                        <PanelButtons.Swap
                            disabled={disabledActions}
                            isLoading={isNetworkChanging}
                        />
                    )}
                    {isBridgeEnabled && (
                        <PanelButtons.Bridge
                            disabled={disabledActions}
                            isLoading={isNetworkChanging}
                        />
                    )}
                </TokenSummary.Actions>
            </TokenSummary>
        </>
    )
}

export default HomeBalancePanel
