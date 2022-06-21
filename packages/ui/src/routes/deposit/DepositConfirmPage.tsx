import React, { useEffect, useMemo, useState } from "react"

import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"

import { Classes } from "../../styles/classes"

import classnames from "classnames"

import { useBlankState } from "../../context/background/backgroundHooks"

import { BigNumber } from "ethers"
import { formatUnits, parseUnits } from "ethers/lib/utils"
import { useTransactionWaitingDialog } from "../../context/hooks/useTransactionWaitingDialog"

import { KnownCurrencies } from "@block-wallet/background/controllers/blank-deposit/types"
import { useHasSufficientBalance } from "../../context/hooks/useHasSufficientBalance"
import {
    getAnonimitySet,
    getDepositTransactionGasLimit,
    getLatestGasPrice,
    makeBlankDeposit,
} from "../../context/commActions"
import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import { DEPOSIT_GAS_COST } from "../../util/constants"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { TokenWithBalance } from "../../context/hooks/useTokensList"
import { GasPriceSelector } from "../../components/transactions/GasPriceSelector"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import GasPriceComponent from "../../components/transactions/GasPriceComponent"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { formatNumberLength } from "../../util/formatNumberLength"
import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import WaitingDialog from "../../components/dialog/WaitingDialog"
import { useLocationRecovery } from "../../util/hooks/useLocationRecovery"
import infoIcon from "../../assets/images/icons/info_circle.svg"
import GenericTooltip from "../../components/label/GenericTooltip"
import { useAsync } from "../../util/hooks/useAsync"
import { AdvancedSettings } from "../../components/transactions/AdvancedSettings"
import { useDepositTokens } from "../../context/hooks/useDepositTokens"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { getValueByKey } from "../../util/objectUtils"
import useCheckAccountDeviceLinked from "../../util/hooks/useCheckAccountDeviceLinked"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import { getDeviceFromAccountType } from "../../util/hardwareDevice"
import { useInProgressInternalTransaction } from "../../context/hooks/useInProgressInternalTransaction"
import useLocalStorageState from "../../util/hooks/useLocalStorageState"
import { isHardwareWallet } from "../../util/account"
import { HardwareWalletOpTypes } from "../../context/commTypes"
import { rejectTransaction } from "../../context/commActions"

let freezedAmounts = {
    amountInNativeCurrency: 0,
    fee: BigNumber.from("0"),
    feeInNativeCurrency: 0,
    totalInNativeCurrency: 0,
    total: BigNumber.from("0"),
}

const depositError = "There was an error while making the deposit."
const DepositConfirmPage = () => {
    const history: any = useOnMountHistory()
    let {
        amount,
        selectedToken,
        selectedCurrency,
        isAssetDetailsPage,
    } = useMemo(
        () =>
            history.location.state as {
                amount: string
                selectedCurrency: KnownCurrencies
                selectedToken: TokenWithBalance
                isAssetDetailsPage: boolean
            },
        [history.location.state]
    )
    const [persistedData, setPersistedData] = useLocalStorageState(
        "deposits.confirm",
        {
            initialValue: {
                submitted: false,
            },
            volatile: true,
        }
    )
    const { clear: clearLocationRecovery } = useLocationRecovery()
    const {
        transaction: inProgressTransaction,
        clearTransaction,
    } = useInProgressInternalTransaction()

    useEffect(() => {
        // Tx was either rejected or submitted when the pop-up was closed.
        // If we opened back the pop-up, and there aren't any pending transactions,
        // we should redirect to the home page (this is only checked on component mount)
        if (!inProgressTransaction?.id && persistedData.submitted) {
            history.push("/")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const [isUpdating, setIsUpdating] = useState(false)
    const [customNonce, setCustomNonce] = useState<number | undefined>()

    const {
        exchangeRates,
        nativeCurrency,
        localeInfo,
        networkNativeCurrency,
    } = useBlankState()!
    const {
        isDeviceUnlinked,
        checkDeviceIsLinked,
        resetDeviceLinkStatus,
    } = useCheckAccountDeviceLinked()
    const { isEIP1559Compatible } = useSelectedNetwork()
    const { gasPricesLevels } = useGasPriceData()
    const selectedAccount = useSelectedAccount()
    const network = useSelectedNetwork()
    const logo = useDepositTokens().find(
        ({ token }) =>
            token.symbol.toLowerCase() === selectedCurrency.toLowerCase()
    )?.token?.logo

    const {
        status,
        isOpen,
        dispatch,
        texts,
        titles,
        closeDialog,
        gifs,
    } = useTransactionWaitingDialog(
        inProgressTransaction
            ? {
                  status: inProgressTransaction.status,
                  error: inProgressTransaction.error as Error,
                  epochTime: inProgressTransaction?.approveTime,
              }
            : undefined,
        HardwareWalletOpTypes.SIGN_TRANSACTION,
        selectedAccount.accountType,
        {
            reject: React.useCallback(() => {
                if (inProgressTransaction?.id) {
                    rejectTransaction(inProgressTransaction?.id)
                }
            }, [inProgressTransaction?.id]),
        }
    )

    const [defaultGas, setDefaultGas] = useState<{
        gasPrice: BigNumber
        gasLimit: BigNumber
    }>({
        gasPrice: BigNumber.from(gasPricesLevels.average.gasPrice ?? "0"),
        gasLimit: BigNumber.from(DEPOSIT_GAS_COST),
    })

    const [selectedFees, setSelectedFees] = useState({
        maxPriorityFeePerGas: BigNumber.from(
            gasPricesLevels.average.maxPriorityFeePerGas ?? "0"
        ),
        maxFeePerGas: BigNumber.from(
            gasPricesLevels.average.maxFeePerGas ?? "0"
        ),
    })
    const [selectedGasPrice, setSelectedGasPrice] = useState(
        BigNumber.from(gasPricesLevels.average.gasPrice ?? "0")
    )
    const [selectedGasLimit, setSelectedGasLimit] = useState(
        BigNumber.from(DEPOSIT_GAS_COST)
    )

    const isDepositing = status === "loading" && isOpen
    // If it's EIP multiply by max fee instead
    const feePerGas = !isEIP1559Compatible
        ? selectedGasPrice
        : selectedFees.maxFeePerGas
    const fee = selectedGasLimit.mul(feePerGas)

    const total =
        selectedToken.token.symbol === network.nativeCurrency.symbol
            ? parseUnits(amount, network.nativeCurrency.decimals).add(fee)
            : fee

    // We check balance against state in case history balance is outdated
    const hasEthBalance = useHasSufficientBalance(BigNumber.from(total), {
        symbol: network.nativeCurrency.symbol,
        decimals: network.nativeCurrency.decimals,
    } as Token)

    const hasTokenBalance = useHasSufficientBalance(
        parseUnits(amount, selectedToken.token.decimals),
        selectedToken.token
    )

    const hasBalance =
        selectedToken.token.symbol === network.nativeCurrency.symbol
            ? hasEthBalance
            : hasEthBalance && hasTokenBalance

    const confirm = async () => {
        dispatch({ type: "open", payload: { status: "loading" } })
        const isLinked = await checkDeviceIsLinked()
        if (isLinked) {
            if (!isHardwareWallet(selectedAccount.accountType)) {
                clearLocationRecovery()
            }
            setPersistedData({
                submitted: true,
            })

            makeBlankDeposit(
                { currency: selectedCurrency, amount: amount as any },
                {
                    gasPrice: !isEIP1559Compatible
                        ? selectedGasPrice
                        : undefined,
                    gasLimit: selectedGasLimit,
                    maxFeePerGas: isEIP1559Compatible
                        ? selectedFees.maxFeePerGas
                        : undefined,
                    maxPriorityFeePerGas: isEIP1559Compatible
                        ? selectedFees.maxPriorityFeePerGas
                        : undefined,
                },
                customNonce
            )
        } else {
            closeDialog()
        }
    }

    const ethExchangeRate = exchangeRates[networkNativeCurrency.symbol]
    const tokenExchangeRate = getValueByKey(
        exchangeRates,
        selectedToken.token.symbol,
        0
    )

    const amountInNativeCurrency = toCurrencyAmount(
        parseUnits(amount, selectedToken.token.decimals),
        tokenExchangeRate,
        selectedToken.token.decimals
    )

    const feeInNativeCurrency = toCurrencyAmount(
        fee,
        ethExchangeRate,
        network.nativeCurrency.decimals
    )
    const totalInNativeCurrency = toCurrencyAmount(
        total,
        ethExchangeRate,
        network.nativeCurrency.decimals
    )
    const canDeposit = hasBalance && !isDepositing && !isUpdating

    if (!isDepositing) {
        freezedAmounts = {
            amountInNativeCurrency,
            fee,
            feeInNativeCurrency,
            totalInNativeCurrency,
            total,
        }
    }

    const anonimitySet = useAsync(async () => {
        try {
            return getAnonimitySet({
                amount: amount as any,
                currency: selectedCurrency,
            })
        } catch (error) {
            return undefined
        }
    }, [amount, selectedCurrency])

    useEffect(() => {
        const fetch = async () => {
            try {
                setIsUpdating(true)

                const pair = {
                    currency: selectedCurrency,
                    amount: amount as any,
                }
                const depositGasLimit = selectedToken
                    ? BigNumber.from(
                          (await getDepositTransactionGasLimit(pair)).gasLimit
                      )
                    : BigNumber.from(DEPOSIT_GAS_COST)

                let gasPrice

                if (!isEIP1559Compatible) {
                    gasPrice = await getLatestGasPrice()
                }

                setDefaultGas({
                    gasLimit: BigNumber.from(depositGasLimit),
                    gasPrice: BigNumber.from(
                        !isEIP1559Compatible ? gasPrice : 0
                    ),
                })
            } finally {
                setIsUpdating(false)
            }
        }
        fetch()
    }, [amount, isEIP1559Compatible, selectedCurrency, selectedToken])

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Confirm Deposit"
                    disabled={isDepositing}
                    onBack={() => {
                        history.push({
                            pathname: "/privacy/deposit",
                            state: {
                                isAssetDetailsPage,
                                preSelectedAsset: selectedToken,
                                transitionDirection: "right",
                            },
                        })
                    }}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        type="submit"
                        onClick={confirm}
                        disabled={!canDeposit}
                        isLoading={isDepositing}
                        label="Confirm"
                    />
                </PopupFooter>
            }
        >
            <WaitingDialog
                open={isOpen}
                status={status}
                titles={{
                    loading: titles?.loading || "Depositing...",
                    success: titles?.success || "Success",
                    error: titles?.error || "Error",
                }}
                texts={{
                    loading: texts?.loading || "Initiating the deposit...",
                    success: titles?.success || "You've initiated the deposit.",
                    error: texts?.error || depositError,
                }}
                clickOutsideToClose={false}
                txHash={inProgressTransaction?.transactionParams.hash}
                timeout={2900}
                gifs={gifs}
                onDone={() => {
                    if (status === "error") {
                        closeDialog()
                        setPersistedData({
                            submitted: false,
                        })
                        clearTransaction()
                        return
                    }

                    history.push("/")
                }}
            />
            <div className="flex flex-col px-6 pt-3 space-y-2.5">
                <div className="flex flex-col items-center p-3 w-full text-sm text-center rounded-md bg-primary-100">
                    <span className="text-2xl font-bold flex flex-col items-center">
                        {logo && (
                            <img
                                src={logo}
                                className="w-6 h-6 mb-1"
                                alt={`${selectedCurrency.toUpperCase()}`}
                                title={`${selectedCurrency.toUpperCase()}`}
                            />
                        )}
                        {amount} {selectedCurrency.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                        {formatCurrency(amountInNativeCurrency, {
                            currency: nativeCurrency,
                            locale_info: localeInfo,
                            showSymbol: true,
                        })}
                    </span>
                </div>
                <label className="text-sm text-gray-600">Gas Price</label>
                {!isEIP1559Compatible ? (
                    <GasPriceSelector
                        defaultGasLimit={defaultGas.gasLimit}
                        defaultGasPrice={defaultGas.gasPrice}
                        setGasPriceAndLimit={(gasPrice, gasLimit) => {
                            setSelectedGasPrice(gasPrice)
                            setSelectedGasLimit(gasLimit)
                        }}
                        isParentLoading={isUpdating}
                        disabled={isUpdating}
                    />
                ) : (
                    <GasPriceComponent
                        defaultGas={{
                            defaultLevel: "medium",
                            feeData: {
                                gasLimit: defaultGas.gasLimit,
                            },
                        }}
                        setGas={(gasFees) => {
                            setSelectedGasLimit(gasFees.gasLimit!)
                            setSelectedFees({
                                maxFeePerGas: gasFees.maxFeePerGas!,
                                maxPriorityFeePerGas: gasFees.maxPriorityFeePerGas!,
                            })
                        }}
                        isParentLoading={isUpdating}
                        disabled={isUpdating}
                        displayOnlyMaxValue
                    />
                )}
                <div
                    className={classnames(
                        "flex flex-col items-start px-4 py-3 space-y-2 rounded-md bg-primary-100",
                        !hasBalance
                            ? "border border-red-400"
                            : "border-opacity-0 border-transparent"
                    )}
                >
                    <label
                        htmlFor="amount"
                        className={classnames(
                            Classes.inputLabel,
                            "text-gray-500"
                        )}
                    >
                        AMOUNT +{isEIP1559Compatible && " MAX"} GAS FEE
                    </label>
                    <div className="flex flex-col w-full space-y-1">
                        <div className="flex flex-row justify-between w-full font-bold">
                            <span>Total:</span>
                            <span
                                title={`${
                                    selectedCurrency !==
                                    network.nativeCurrency.symbol.toLowerCase()
                                        ? `${amount} ${selectedCurrency.toUpperCase()} + `
                                        : ""
                                }${formatUnits(
                                    freezedAmounts.total,
                                    network.nativeCurrency.decimals
                                )} ${network.nativeCurrency.symbol}`}
                            >
                                {selectedCurrency !==
                                    network.nativeCurrency.symbol.toLowerCase() &&
                                    `${amount} ${selectedCurrency.toUpperCase()} + `}
                                {formatNumberLength(
                                    formatUnits(
                                        freezedAmounts.total,
                                        network.nativeCurrency.decimals
                                    ),
                                    14
                                )}{" "}
                                {network.nativeCurrency.symbol}
                            </span>
                        </div>
                        <span className="ml-auto text-xs text-gray-500">
                            {formatCurrency(
                                selectedCurrency !==
                                    network.nativeCurrency.symbol.toLowerCase()
                                    ? freezedAmounts.totalInNativeCurrency +
                                          freezedAmounts.amountInNativeCurrency
                                    : freezedAmounts.totalInNativeCurrency,
                                {
                                    currency: nativeCurrency,
                                    locale_info: localeInfo,
                                    showSymbol: true,
                                }
                            )}
                        </span>
                        <span className="text-xs text-red-500">
                            {!hasBalance && "Insufficient balance"}
                        </span>
                    </div>
                </div>
                <AdvancedSettings
                    config={{
                        showCustomNonce: true,
                        showFlashbots: false,
                        address: selectedAccount.address,
                    }}
                    data={{
                        flashbots: false,
                    }}
                    setData={(data) => {
                        setCustomNonce(data.customNonce)
                    }}
                />
                <div>
                    <div className="flex flex-row w-full space-x-2">
                        <span className="text-sm font-bold">Anonymity set</span>
                        <div className="group relative">
                            <img
                                src={infoIcon}
                                alt="info"
                                className="w-3 h-3 mt-1 font-normal text-xs text-gray-500"
                            />
                            <GenericTooltip
                                top
                                content={
                                    <p className="w-40 p-1 text-left">
                                        Number of deposits in this pool from
                                        which a withdrawal will potentially
                                        originate
                                    </p>
                                }
                            />
                        </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                        <span className="font-bold">{anonimitySet || "-"}</span>{" "}
                        <span>equal user deposits</span>
                    </div>
                </div>
            </div>
            <HardwareDeviceNotLinkedDialog
                onDone={resetDeviceLinkStatus}
                isOpen={isDeviceUnlinked}
                vendor={getDeviceFromAccountType(selectedAccount.accountType)}
                address={selectedAccount.address}
            />
        </PopupLayout>
    )
}

export default DepositConfirmPage
