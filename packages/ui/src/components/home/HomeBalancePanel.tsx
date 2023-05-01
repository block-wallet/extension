import { useBlankState } from "../../context/background/backgroundHooks"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import TokenSummary from "../token/TokenSummary"
import PanelButtons from "./PanelButtons"
import useNetWorthBalance from "../../context/hooks/useNetWorthBalance"
import { AiFillInfoCircle } from "react-icons/ai"
import Tooltip from "../label/Tooltip"

const HomeBalancePanel = () => {
    const { isNetworkChanging, isUserNetworkOnline, nativeCurrency } =
        useBlankState()!
    const { isSendEnabled, isSwapEnabled, isBridgeEnabled } =
        useSelectedNetwork()
    const netWorth = useNetWorthBalance()

    const disabledActions = !isSendEnabled || !isUserNetworkOnline

    return (
        <div className="px-12">
            <TokenSummary className="p-4">
                <TokenSummary.Balances className="!space-y-0">
                    <TokenSummary.TokenBalance title={netWorth}>
                        {netWorth}
                    </TokenSummary.TokenBalance>

                    <TokenSummary.ExchangeRateBalance className="flex items-center text-xs">
                        <div className="group relative">
                            <a
                                href="https://help.blockwallet.io/hc/en-us/articles/14296951040785"
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
                                                <span>
                                                    Your NET worth is the summed{" "}
                                                    {nativeCurrency.toUpperCase()}{" "}
                                                    value
                                                    <br /> of all assets in your
                                                    asset list.
                                                </span>{" "}
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
                        Net Worth
                    </TokenSummary.ExchangeRateBalance>
                </TokenSummary.Balances>
                <TokenSummary.Actions>
                    <PanelButtons.Send
                        disabled={disabledActions}
                        isLoading={isNetworkChanging}
                    />
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
        </div>
    )
}

export default HomeBalancePanel
