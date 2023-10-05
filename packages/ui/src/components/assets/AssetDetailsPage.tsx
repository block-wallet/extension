import { formatUnits } from "@ethersproject/units"
import { useState } from "react"
import { deleteCustomToken } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { Classes, classnames } from "../../styles"
import { formatRounded } from "../../util/formatRounded"
import useCurrencyFromatter from "../../util/hooks/useCurrencyFormatter"
import useGetAssetByTokenAddress from "../../util/hooks/useGetAssetByTokenAddress"
import { useBlankState } from "../../context/background/backgroundHooks"
import { generateExplorerLink, getExplorerTitle } from "../../util/getExplorer"
import RoundedIconButton from "../button/RoundedIconButton"
import AnimatedIcon, { AnimatedIconName } from "../../components/AnimatedIcon"
import ArrowHoverAnimation from "../icons/ArrowHoverAnimation"
import openExternal from "../../assets/images/icons/open_external.svg"
import PopupHeader from "../popup/PopupHeader"
import PopupLayout from "../popup/PopupLayout"
import TokenSummary from "../token/TokenSummary"
import log from "loglevel"
import ConfirmDialog from "../dialog/ConfirmDialog"
import { isNativeTokenAddress } from "../../util/tokenUtils"
import SuccessDialog from "../dialog/SuccessDialog"
import { formatName } from "../../util/formatAccount"
import Icon, { IconName } from "../ui/Icon"
import { useExchangeRatesState } from "../../context/background/useExchangeRatesState"
import ActivityAllowancesView from "./ActivityAllowancesView"
import TokenLogo from "../token/TokenLogo"
import PanelButtons from "../home/PanelButtons"

const AssetDetailsPage = () => {
    const state = useBlankState()!
    const history: any = useOnMountHistory()
    const address = history.location.state.address
    const {
        state: { isRatesChangingAfterNetworkChange },
    } = useExchangeRatesState()
    const { availableNetworks, selectedNetwork } = useBlankState()!

    const account = useSelectedAccount()
    const currencyFormatter = useCurrencyFromatter()
    const { isSendEnabled, isSwapEnabled, isBridgeEnabled } =
        useSelectedNetwork()
    const asset = useGetAssetByTokenAddress(address)
    const isNative = isNativeTokenAddress(address)

    const [confirmOpen, setConfirmOpen] = useState(false)
    const [isRemoving, setIsRemoving] = useState(false)
    const [successOpen, setSuccessOpen] = useState(false)

    if (!asset) {
        return null
    }

    const { token, balance } = asset
    if (!token) {
        return <p>Token not found</p>
    }

    const formattedTokenBalance = formatUnits(balance || "0", token.decimals)

    const roundedTokenBalance = formatRounded(formattedTokenBalance, 5)

    const explorerName = getExplorerTitle(availableNetworks, selectedNetwork)

    const optionsWidth = (explorerName?.length ?? 0) > 10 ? "w-44" : "w-40"

    const removeToken = async () => {
        try {
            setIsRemoving(true)
            await deleteCustomToken(token.address)
            setIsRemoving(false)

            history.push({ pathname: "/home" })
        } catch (error) {
            log.error("Eror deleting token from list")
        }
    }

    const disabledActions = !isSendEnabled || !state.isUserNetworkOnline

    return (
        <PopupLayout
            header={
                <PopupHeader
                    onBack={() => history.push("/home")}
                    title={`${formatName(account.name, 14)} - ${formatName(
                        token.symbol,
                        12
                    )}`}
                    close={false}
                    disabled={isRemoving}
                    networkIndicator
                    actions={
                        !isNative
                            ? [
                                  <a
                                      href={generateExplorerLink(
                                          availableNetworks,
                                          selectedNetwork,
                                          token.address,
                                          "address"
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      key={1}
                                  >
                                      <div
                                          className={classnames(
                                              "text-grey-900 cursor-pointer flex flex-row items-center p-2 hover:bg-gray-100 rounded-t-md",
                                              optionsWidth
                                          )}
                                      >
                                          <div className="pl-1 pr-1 w-8">
                                              <img
                                                  width={"16"}
                                                  height={"16"}
                                                  src={openExternal}
                                                  alt={`View on ${explorerName}`}
                                              />
                                          </div>
                                          <span>View on {explorerName}</span>
                                      </div>
                                  </a>,
                                  <div
                                      key={2}
                                      onClick={() => {
                                          setConfirmOpen(true)
                                      }}
                                      className={classnames(
                                          "text-red-500 cursor-pointer flex flex-row items-center p-2 hover:bg-gray-100 rounded-b-md w-40",
                                          optionsWidth
                                      )}
                                  >
                                      <div className="pl-1 pr-1 w-8">
                                          <Icon
                                              name={IconName.TRASH_BIN}
                                              profile="danger"
                                          />
                                      </div>
                                      <span>Remove Token</span>
                                  </div>,
                              ]
                            : undefined
                    }
                />
            }
            showProviderStatus
        >
            <ConfirmDialog
                title="Remove Token"
                message={`Are you sure you want to remove ${token.symbol} token from the list?`}
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={() => {
                    setSuccessOpen(true)
                    setConfirmOpen(false)
                }}
            />
            <SuccessDialog
                open={successOpen}
                title={"Token Removed"}
                message={`${token.symbol} token was successfully removed.`}
                onDone={() => {
                    setSuccessOpen(false)
                    removeToken()
                }}
                timeout={1000}
            />

            <div className="flex flex-col items-start flex-1 w-full h-0 max-h-screen p-6 space-y-6 overflow-auto hide-scroll">
                <TokenSummary>
                    <TokenSummary.Balances>
                        <TokenLogo
                            logo={token.logo}
                            name={token.symbol ?? ""}
                            filled={true}
                            logoSize="big"
                        />
                        <TokenSummary.TokenName>
                            {token.name}
                        </TokenSummary.TokenName>
                        <TokenSummary.TokenBalance
                            className="flex flex-row space-x-1"
                            title={`${formattedTokenBalance} ${token.symbol}`}
                            isLoading={state.isNetworkChanging}
                        >
                            <span
                                className="truncate w-full max-w-xs"
                                style={{ maxWidth: "18rem" }}
                            >
                                {`${roundedTokenBalance} ${token.symbol}`}
                            </span>
                        </TokenSummary.TokenBalance>
                        <TokenSummary.ExchangeRateBalance
                            isLoading={isRatesChangingAfterNetworkChange}
                        >
                            {currencyFormatter.format(
                                balance,
                                token.symbol,
                                token.decimals,
                                isNative
                            )}
                        </TokenSummary.ExchangeRateBalance>
                    </TokenSummary.Balances>
                    <TokenSummary.Actions className="mb-4">
                        <PanelButtons.Send
                            disabled={disabledActions}
                            redirectState={{
                                asset,
                                transitionDirection: "left",
                            }}
                        />
                        {isSwapEnabled && (
                            <PanelButtons.Swap
                                disabled={disabledActions}
                                redirectState={{
                                    fromToken: asset.token,
                                    fromTokenBalance: asset.balance,
                                    fromAssetPage: true,
                                    transitionDirection: "left",
                                }}
                            />
                        )}
                        {isBridgeEnabled && (
                            <PanelButtons.Bridge
                                disabled={disabledActions}
                                redirectState={{
                                    token: asset.token,
                                    fromAssetPage: true,
                                    transitionDirection: "left",
                                }}
                            />
                        )}
                    </TokenSummary.Actions>
                </TokenSummary>
                <ActivityAllowancesView tokenAddress={asset.token.address} />
            </div>
        </PopupLayout>
    )
}

export default AssetDetailsPage
