import { useEffect, useState, useMemo } from "react"
import { BigNumber } from "ethers"
import { parseUnits } from "ethers/lib/utils"

import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import VerticalSelect from "../../components/input/VerticalSelect"

import { Classes, classnames } from "../../styles/classes"

import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"

import { getCurrencyAmountList } from "../../context/util/getCurrencyAmountList"

import { KnownCurrencies } from "@block-wallet/background/controllers/blank-deposit/types"
import { usePendingDeposits } from "../../context/hooks/usePendingDeposits"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import Spinner from "../../components/spinner/Spinner"
import {
    AssetListType,
    AssetSelection,
} from "../../components/assets/AssetSelection"
import {
    TokenWithBalance,
    useTokensList,
} from "../../context/hooks/useTokensList"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import useLocalStorageState from "../../util/hooks/useLocalStorageState"
import {
    getDepositInstanceAllowance,
    setUserSettings,
} from "../../context/commActions"
import log from "loglevel"
import { isNativeTokenAddress } from "../../util/tokenUtils"
import CollapsableWarning from "../../components/CollapsableWarning"
import { isHardwareWallet, isInternalAccount } from "../../util/account"
import { AccountType } from "../../context/commTypes"
import { AiOutlineWarning } from "react-icons/ai"
import { useBlankState } from "../../context/background/backgroundHooks"

const getWarningMessage = (accountType: AccountType) => {
    let hardwareMessage = undefined
    if (isHardwareWallet(accountType)) {
        hardwareMessage = (
            <span>
                Deposit notes are not stored in your connected hardware device.{" "}
                <br />
            </span>
        )
    }
    return (
        <>
            {hardwareMessage}
            <span>
                If you make a deposit with an external account, the seed phrase
                of the BlockWallet extension is required to reconstruct your
                notes on another BlockWallet installation.
            </span>
        </>
    )
}

interface DepositPageLocationState {
    isAssetDetailsPage: boolean
    preSelectedAsset?: TokenWithBalance
}

const DepositPage = () => {
    const history = useOnMountHistory()
    const account = useSelectedAccount()
    const { chainId } = useSelectedNetwork()
    const { nativeToken } = useTokensList()
    const { settings } = useBlankState()!
    const [persistedState, setPersistedState] = useLocalStorageState(
        "deposit.form",
        {
            //if there is nothing in the state, use the nativeToken
            initialValue: { asset: nativeToken, amount: "" },
            volatile: true,
        }
    )

    const { preSelectedAsset: historySelectedAsset, isAssetDetailsPage } =
        history.location.state as DepositPageLocationState

    const preSelectedAsset = historySelectedAsset ?? nativeToken

    const [selectedCurrency, setSelectedCurrency] = useState<KnownCurrencies>(
        preSelectedAsset.token.symbol.toLowerCase() as KnownCurrencies
    )
    const [selectedToken, setSelectedToken] =
        useState<TokenWithBalance>(preSelectedAsset)

    const [amountsList, setAmountsList] = useState<Array<any>>([])

    const globalPendingDeposits = usePendingDeposits()
    const [pendingDeposits, setPendingDeposits] = useState<{
        [k: string]: boolean
    }>({})

    const [isLoading, setIsLoading] = useState<boolean>(false)

    const chainTokensWithBalance = Object.values(
        account.balances[chainId].tokens
    )

    const selectedTokenBalance = useMemo(() => {
        const selectedTokenWithBalance = chainTokensWithBalance.find(
            ({ token }) => {
                return (
                    token.symbol.toLowerCase() ===
                    selectedCurrency?.toLowerCase()
                )
            }
        )
        return selectedTokenWithBalance
            ? BigNumber.from(selectedTokenWithBalance.balance)
            : BigNumber.from(0)
    }, [selectedCurrency, chainTokensWithBalance])

    useEffect(() => {
        if (!selectedCurrency) return

        const amounts = getCurrencyAmountList(selectedCurrency)
        setAmountsList(amounts)

        setPendingDeposits(
            globalPendingDeposits
                ? globalPendingDeposits[selectedCurrency]
                : ({} as any)
        )
    }, [selectedCurrency, globalPendingDeposits])

    const disabledOptions = useMemo(() => {
        if (!selectedCurrency || !selectedToken) return []

        const amounts: string[] = getCurrencyAmountList(selectedCurrency)

        return amounts.map((amount: string) => {
            const r = selectedTokenBalance.lt(
                parseUnits(amount, selectedToken.token.decimals)
            )
            return r
        })
    }, [selectedCurrency, selectedTokenBalance, selectedToken])

    const dismissExternalAccountWarning = () => {
        setUserSettings({
            ...settings,
            hideDepositsExternalAccountsWarning: true,
        })
    }

    const next = async () => {
        const { amount } = persistedState

        if (!amount || !selectedToken || !selectedCurrency) {
            log.error("Missing parameters to advance. This shouldn't happen")
            return
        }

        const depositConfirmState = {
            amount,
            isAssetDetailsPage,
            selectedToken,
            selectedCurrency,
        }

        if (isNativeTokenAddress(selectedToken.token.address)) {
            history.push({
                pathname: "/privacy/deposit/confirm",
                state: depositConfirmState,
            })
            return
        }

        try {
            setIsLoading(true)

            const allowance = await getDepositInstanceAllowance({
                currency: selectedCurrency,
                amount: amount as any,
            })

            const hasAllowance = BigNumber.from(allowance).gte(
                parseUnits(amount, selectedToken.token.decimals)
            )

            if (hasAllowance) {
                history.push({
                    pathname: "/privacy/deposit/confirm",
                    state: depositConfirmState,
                })
            } else {
                history.push({
                    pathname: "/transaction/approve",
                    state: {
                        assetAddress: selectedToken.token.address,
                        minAllowance: parseUnits(
                            amount,
                            selectedToken.token.decimals
                        ),
                        nextLocationState: depositConfirmState,
                    },
                })
            }
        } catch (error) {
            log.error("Error checking asset allowance")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Deposit to Privacy Pool"
                    onBack={() => {
                        history.push({
                            pathname: "/privacy",
                            state: { preSelectedAsset, isAssetDetailsPage },
                        })
                    }}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Next"
                        disabled={
                            !persistedState?.amount ||
                            (pendingDeposits &&
                                pendingDeposits[persistedState?.amount!])
                        }
                        onClick={next}
                        isLoading={isLoading}
                    />
                </PopupFooter>
            }
        >
            {!isInternalAccount(account.accountType) && (
                <CollapsableWarning
                    dialog={{
                        title: "Warning",
                        message: getWarningMessage(account.accountType),
                    }}
                    isCollapsedByDefault={
                        settings.hideDepositsExternalAccountsWarning
                    }
                    collapsedMessage={
                        <div className="text-center bg-yellow-200 hover:bg-yellow-100 opacity-90  w-full p-2 space-x-2 flex tems-center font-bold justify-center">
                            <AiOutlineWarning className="w-4 h-4 yellow-300" />
                            <span className="text-xs text-yellow-900">
                                <span className="font-bold">
                                    BlockWallet seed phrase is used.
                                </span>
                            </span>
                        </div>
                    }
                    onDismiss={dismissExternalAccountWarning}
                />
            )}
            <div
                className={classnames(
                    "flex flex-col px-6 space-y-1",
                    isInternalAccount(account.accountType)
                        ? "py-6"
                        : "pt-3 pb-6"
                )}
            >
                <div className="mb-2">
                    <p className="mb-2 text-sm text-gray-600">Asset</p>
                    <AssetSelection
                        selectedAsset={selectedToken}
                        selectedAssetList={AssetListType.DEPOSIT}
                        onAssetChange={(asset) => {
                            setSelectedToken(asset)
                            setSelectedCurrency(
                                asset.token.symbol.toLowerCase() as KnownCurrencies
                            )
                            setPersistedState({
                                asset,
                                amount: "",
                            })
                        }}
                        topMargin={100}
                        bottomMargin={45}
                    />
                </div>

                {selectedCurrency && (
                    <>
                        <label htmlFor="address" className={Classes.inputLabel}>
                            Select Amount
                        </label>
                        <VerticalSelect
                            options={amountsList}
                            value={persistedState?.amount}
                            onChange={(amount) => {
                                setPersistedState({
                                    ...persistedState,
                                    amount,
                                })
                            }}
                            disabledOptions={Object.values(pendingDeposits).map(
                                (value, i) => value || disabledOptions[i]
                            )}
                            display={(option) => (
                                <div
                                    title={`Deposit ${option} ${selectedCurrency.toUpperCase()} to Privacy Pool`}
                                    className="w-full flex flex-row justify-between"
                                >
                                    <span className="text-left w-22">
                                        {option}{" "}
                                        {selectedCurrency.toUpperCase()}
                                    </span>
                                    {pendingDeposits[option] ? (
                                        <>
                                            <span className="text-xs mt-0.5">
                                                Pending deposit...
                                            </span>
                                            <Spinner />
                                        </>
                                    ) : (
                                        ""
                                    )}
                                </div>
                            )}
                        />
                    </>
                )}
            </div>
        </PopupLayout>
    )
}

export default DepositPage
