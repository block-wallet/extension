
import GasPriceComponent from "../../components/transactions/GasPriceComponent"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import RateUpdateDialog from "../../components/swaps/RateUpdateDialog"
import React, {
    useState,
    useEffect,
    useMemo,
    FC,
    useLayoutEffect,
} from "react"
import TransactionDetails from "../../components/transactions/TransactionDetails"
import WaitingDialog from "../../components/dialog/WaitingDialog"

import useCheckAccountDeviceLinked from "../../util/hooks/useCheckAccountDeviceLinked"
import useLocalStorageState from "../../util/hooks/useLocalStorageState"
import {
    executeExchange,
    rejectTransaction,
} from "../../context/commActions"
import {
    SwapQuoteResponse,
    SwapTransaction,
} from "@block-wallet/background/controllers/SwapController"
import {
    HardwareWalletOpTypes,
    TransactionCategories,
    TransactionStatus,
} from "../../context/commTypes"
import {
    DEFAULT_EXCHANGE_TYPE,
    calcExchangeRate,
    calculatePricePercentageImpact,
    calculateUsdValueDiff,
    populateExchangeTransaction,
} from "../../util/exchangeUtils"
import { createTokenBigNumber } from "../../util/bigNumberUtils"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { GasPriceSelector } from "../../components/transactions/GasPriceSelector"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { classnames } from "../../styles"

import { getDeviceFromAccountType } from "../../util/hardwareDevice"
import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import { useInProgressInternalTransaction } from "../../context/hooks/useInProgressInternalTransaction"
import { useLocationRecovery } from "../../util/hooks/useLocationRecovery"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useTransactionWaitingDialog } from "../../context/hooks/useTransactionWaitingDialog"
import { useTokensList } from "../../context/hooks/useTokensList"
import { isHardwareWallet } from "../../util/account"
import useCountdown from "../../util/hooks/useCountdown"

import OutlinedButton from "../../components/ui/OutlinedButton"
import Icon, { IconName } from "../../components/ui/Icon"
import {
    AdvancedSettings,
    defaultAdvancedSettings,
} from "../../components/transactions/AdvancedSettings"
import { TransactionAdvancedData } from "@block-wallet/background/controllers/transactions/utils/types"
import { WithRequired } from "@block-wallet/background/utils/types/helpers"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useTransactionById } from "../../context/hooks/useTransactionById"
import useAwaitAllowanceTransactionDialog from "../../context/hooks/useAwaitAllowanceTransactionDialog"
import WaitingAllowanceTransactionDialog from "../../components/dialog/WaitingAllowanceTransactionDialog"
import PriceImpactDialog from "../../components/swaps/PriceImpactDialog"
import WarningDialog from "../../components/dialog/WarningDialog"
import SwapAlerts from "../../components/swap/SwapAlerts"
import SwapAssetsDisplay from "../../components/swap/SwapAssetsDisplay"
import SwapRateInfo from "../../components/swap/SwapRateInfo"
import SwapSimulationDisplay from "../../components/swap/SwapSimulationDisplay"
import { useSwapParameters } from "../../hooks/useSwapParameters"
import { useSwapGasManagement } from "../../hooks/useSwapGasManagement"
import { useSwapBalances } from "../../hooks/useSwapBalances"
import { useSwapSimulation } from "../../hooks/useSwapSimulation"

export interface SwapConfirmPageLocalState {
    fromToken: Token
    swapQuote: SwapQuoteResponse
    toToken: Token
    amount?: string
    allowanceTransactionId?: string
}

interface SwapConfirmPagePersistedState {
    submitted: boolean
    txId: string
}

const NOT_ENOUGH_BALANCE_ERROR =
    "Balance too low to cover swap and gas cost. Please review gas configuration."

const QUOTE_REFRESH_TIMEOUT = 1000 * 15
const PRICE_IMPACT_THRESHOLD = 0.1
const VALUE_DIFF_WARN_THRESHOLD = -0.05



const SwapPageConfirm: FC<{}> = () => {
    const history = useOnMountHistory()
    const { exchangeRates, settings } = useBlankState()!
    const { fromToken, swapQuote, toToken, allowanceTransactionId } = useMemo(
        () => history.location.state as SwapConfirmPageLocalState,
        [history.location.state]
    )
    const [isPriceImpactDialogOpened, setIsPriceImpactDialogOpened] =
        useState<boolean>(false)
    const [isSimFailDialogOpened, setIsSimFailDialogOpened] = useState<boolean>(false)
    const [overrideSimulationWarning, setOverrideSimulationWarning] = useState<boolean>(false)
    const [isPriceDiffDialogOpened, setIsPriceDiffDialogOpened] =
        useState<boolean>(false)

    const [persistedData, setPersistedData] =
        useLocalStorageState<SwapConfirmPagePersistedState>("swaps.confirm", {
            initialValue: {
                submitted: false,
                txId: "",
            },
            volatile: true,
        })

    const { clear: clearLocationRecovery } = useLocationRecovery()
    const { transaction: inProgressTransaction, clearTransaction } =
        useInProgressInternalTransaction({
            categories: [TransactionCategories.EXCHANGE],
            txId: persistedData.txId,
        })
    const selectedAccount = useSelectedAccount()

    useEffect(() => {
        if (
            inProgressTransaction?.id &&
            persistedData.submitted &&
            persistedData.txId !== inProgressTransaction?.id
        ) {
            if (isHardwareWallet(selectedAccount.accountType)) {
                setPersistedData((prev: SwapConfirmPagePersistedState) => ({
                    ...prev,
                    txId: inProgressTransaction?.id,
                }))
            }
        }
    }, [
        inProgressTransaction?.id,
        persistedData.submitted,
        persistedData.txId,
        selectedAccount.accountType,
        setPersistedData
    ])

    useLayoutEffect(() => {
        if (
            !inProgressTransaction?.id &&
            persistedData.submitted &&
            !persistedData.txId
        ) {
            history.push("/")
        }
    }, [
        inProgressTransaction?.id,
        persistedData.submitted,
        persistedData.txId,
        history
    ])

    const { gasPricesLevels } = useGasPriceData()
    const { isEIP1559Compatible } = useSelectedNetwork()
    const { defaultGasOption } = useBlankState()!
    const { nativeToken } = useTokensList()
    const { isDeviceUnlinked, checkDeviceIsLinked, resetDeviceLinkStatus } =
        useCheckAccountDeviceLinked()

    const { status, isOpen, dispatch, texts, titles, closeDialog, gifs } =
        useTransactionWaitingDialog(
            inProgressTransaction
                ? {
                    id: inProgressTransaction.id,
                    status: inProgressTransaction.status,
                    error: inProgressTransaction.error as Error,
                    epochTime: inProgressTransaction?.approveTime,
                    qrParams: inProgressTransaction?.qrParams,
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

    const { transaction: allowanceTransaction } = useTransactionById(
        allowanceTransactionId
    )

    const isInProgressAllowanceTransaction = allowanceTransaction
        ? allowanceTransaction.status !== TransactionStatus.CONFIRMED
        : false

    const {
        status: allowanceTxDialogStatus,
        isOpen: allowanceTxDialogIsOpen,
        closeDialog: closeAllowanceTxDialog,
    } = useAwaitAllowanceTransactionDialog(allowanceTransaction)


    const [showDetails, setShowDetails] = useState<boolean>(false)
    const [advancedSettings, setAdvancedSettings] = useState<
        WithRequired<TransactionAdvancedData, "slippage">
    >(defaultAdvancedSettings)

    const isSwapping = status === "loading" && isOpen
    const shouldFetchSwapParams = status !== "loading" && status !== "success"

    const {
        swapParameters,
        error,
        isLoading: isFetchingSwaps,
        timeoutStart
    } = useSwapParameters({
        fromAddress: selectedAccount.address,
        swapQuote,
        slippage: advancedSettings.slippage,
        shouldFetch: shouldFetchSwapParams && !isInProgressAllowanceTransaction,
        refreshInterval: QUOTE_REFRESH_TIMEOUT
    })

    const { value: remainingSeconds } = useCountdown(
        timeoutStart,
        QUOTE_REFRESH_TIMEOUT
    )

    const {
        defaultGas,
        selectedFees,
        selectedGasPrice,
        selectedGasLimit,
        isGasLoading,
        gasError,
        setSelectedFees,
        setSelectedGasPrice,
        setSelectedGasLimit,
    } = useSwapGasManagement({
        swapParameters,
        isEIP1559Compatible,
        defaultGasPrices: {
            gasPrice: gasPricesLevels.average.gasPrice?.toString(),
            maxPriorityFeePerGas: gasPricesLevels.average.maxPriorityFeePerGas?.toString(),
            maxFeePerGas: gasPricesLevels.average.maxFeePerGas?.toString(),
        },
        hasBalance: true
    })

    const feePerGas = isEIP1559Compatible
        ? selectedFees.maxFeePerGas
        : selectedGasPrice
    const fee = selectedGasLimit.mul(feePerGas)

    const {
        fromTokenAmount,
        hasBalance,
    } = useSwapBalances({
        swapParameters,
        swapQuote,
        fromToken,
        nativeToken: nativeToken.token,
        fee
    })

    const {
        simulation,
        simulationError,
    } = useSwapSimulation({
        swapParameters,
        isSimulationEnabled: settings.enableTransactionSimulation
    })

    const pricePercentageImpact = useMemo(() => {
        if (swapParameters) {
            return calculatePricePercentageImpact(
                exchangeRates,
                {
                    token: swapParameters.fromToken,
                    amount: createTokenBigNumber(swapParameters.fromTokenAmount, swapParameters.fromToken.decimals),
                },
                {
                    token: swapParameters.toToken,
                    amount: createTokenBigNumber(swapParameters.toTokenAmount, swapParameters.toToken.decimals),
                }
            )
        }
        return undefined
    }, [swapParameters, exchangeRates])

    const usdValueDiff = useMemo(() => {
        const fromT = swapParameters
            ? {
                token: swapParameters.fromToken,
                amount: createTokenBigNumber(swapParameters.fromTokenAmount, swapParameters.fromToken.decimals),
            }
            : {
                token: swapQuote.fromToken,
                amount: createTokenBigNumber(swapQuote.fromTokenAmount, swapQuote.fromToken.decimals),
            }

        const toT = swapParameters
            ? {
                token: swapParameters.toToken,
                amount: createTokenBigNumber(swapParameters.toTokenAmount, swapParameters.toToken.decimals),
            }
            : {
                token: swapQuote.toToken,
                amount: createTokenBigNumber(swapQuote.toTokenAmount, swapQuote.toToken.decimals),
            }

        return calculateUsdValueDiff(exchangeRates, fromT, toT)
    }, [swapParameters, swapQuote, exchangeRates])







    const toTokenAmount = swapParameters?.toTokenAmount || swapQuote.toTokenAmount
    const toTokenDecimals = swapParameters?.toToken.decimals || swapQuote.toToken.decimals
    const exchangeRate = calcExchangeRate(
        fromTokenAmount,
        fromToken.decimals,
        createTokenBigNumber(toTokenAmount, toTokenDecimals),
        toToken.decimals
    )

    const shouldWarnPriceDiff = useMemo(() => {
        return (
            usdValueDiff.percent !== undefined &&
            usdValueDiff.percent <= VALUE_DIFF_WARN_THRESHOLD
        )
    }, [usdValueDiff])





    const onSubmit = async () => {
        if (error || !swapParameters || !hasBalance) return
        if (
            settings.enableTransactionSimulation &&
            simulationError &&
            !overrideSimulationWarning
        ) {
            setIsSimFailDialogOpened(true)
            return
        }

        dispatch({ type: "open", payload: { status: "loading" } })
        const isLinked = await checkDeviceIsLinked()
        if (isLinked) {
            if (!isHardwareWallet(selectedAccount.accountType)) {
                clearLocationRecovery()
            }

            setPersistedData((prev: SwapConfirmPagePersistedState) => ({
                ...prev,
                submitted: true,
            }))

            const swapTransactionParams: SwapTransaction = {
                ...swapParameters,
                customNonce: advancedSettings.customNonce,
                flashbots: advancedSettings.flashbots,
                gasPrice: isEIP1559Compatible
                    ? undefined
                    : selectedGasPrice || swapParameters.tx.gasPrice,
                maxPriorityFeePerGas: isEIP1559Compatible
                    ? selectedFees.maxPriorityFeePerGas
                    : undefined,
                maxFeePerGas: isEIP1559Compatible
                    ? selectedFees.maxFeePerGas
                    : undefined,
                tx: {
                    ...swapParameters.tx,
                    gas: selectedGasLimit.toNumber() || swapParameters.tx.gas,
                },
            }
            await executeExchange(DEFAULT_EXCHANGE_TYPE, swapTransactionParams)
        } else {
            closeDialog()
        }
    }







    const remainingSuffix = Math.ceil(remainingSeconds!)
        ? `${Math.floor(remainingSeconds!)}s`
        : ""

    const rate = useMemo(() => {
        return createTokenBigNumber(
            swapParameters?.toTokenAmount || swapQuote.toTokenAmount,
            swapParameters?.toToken.decimals || swapQuote.toToken.decimals
        )
    }, [swapParameters?.toTokenAmount, swapQuote.toTokenAmount, swapParameters?.toToken.decimals, swapQuote.toToken.decimals])

    let errMessage = error || gasError

    if (!hasBalance && swapParameters) {
        errMessage = NOT_ENOUGH_BALANCE_ERROR
    }

    const priceImpactWarning =
        pricePercentageImpact !== undefined
            ? pricePercentageImpact > PRICE_IMPACT_THRESHOLD
            : !!swapParameters

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Confirm Swap"
                    onBack={() => {
                        history.push({
                            pathname: "/swap",
                            state: history.location.state,
                        })
                    }}
                    disabled={isSwapping}
                    networkIndicator
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Swap"
                        isLoading={
                            errMessage || isInProgressAllowanceTransaction
                                ? false
                                : !swapParameters ||
                                isGasLoading ||
                                isFetchingSwaps ||
                                isSwapping
                        }
                        onClick={onSubmit}
                        disabled={!!errMessage}
                    />
                </PopupFooter>
            }
            showProviderStatus
        >
            <WaitingAllowanceTransactionDialog
                status={allowanceTxDialogStatus}
                isOpen={allowanceTxDialogIsOpen}
                onSuccess={closeAllowanceTxDialog}
                onError={() =>
                    history.push({
                        pathname: "/swap",
                        state: {
                            ...history.location.state,
                            allowanceTransactionId: undefined,
                        },
                    })
                }
                operation="swap"
            />
            <WaitingDialog
                open={isOpen}
                status={status}
                titles={{
                    loading: titles?.loading || "Making swap...",
                    success: titles?.success || "Success",
                    error: titles?.error || "Error",
                }}
                texts={{
                    loading: texts?.loading || "Initiating the swap...",
                    success: titles?.success || "You've initiated the swap",
                    error: texts?.error || "Error making the swap",
                }}
                clickOutsideToClose={false}
                txHash={inProgressTransaction?.transactionParams.hash}
                timeout={1500}
                gifs={gifs}
                onDone={React.useCallback(() => {
                    if (status === "error") {
                        closeDialog()
                        setPersistedData(
                            (prev: SwapConfirmPagePersistedState) => ({
                                ...prev,
                                submitted: true,
                                txId: "",
                            })
                        )
                        clearTransaction()
                        return
                    }

                    history.push("/")
                }, [
                    status,
                    history,
                    closeDialog,
                    setPersistedData,
                    clearTransaction,
                ])}
                showCloseButton
            />
            {swapParameters && (
                <TransactionDetails
                    transaction={populateExchangeTransaction(swapParameters)}
                    open={showDetails}
                    onClose={() => setShowDetails(false)}
                    nonce={advancedSettings.customNonce}
                />
            )}
            {shouldWarnPriceDiff && (
                <WarningDialog
                    open={isPriceDiffDialogOpened}
                    title={"Risk detail"}
                    message={
                        <div className="text-left">
                            <div className="font-semibold mb-1">Warning</div>
                            <div>Price difference is too big.</div>
                        </div>
                    }
                    onDone={() => setIsPriceDiffDialogOpened(false)}
                    buttonLabel="Ignore the risk alert"
                    cancelButton
                    cancelLabel="Back"
                    onCancel={() => setIsPriceDiffDialogOpened(false)}
                />
            )}
            {simulationError && (
                <WarningDialog
                    open={isSimFailDialogOpened}
                    title={"Transaction may fail"}
                    message={
                        <div className="text-left">
                            <div className="font-semibold mb-1">Warning</div>
                            <div>Pre-sign simulation indicates a revert:</div>
                            <div className="mt-1 break-words text-xs">
                                {simulationError}
                            </div>
                        </div>
                    }
                    onDone={() => {
                        setOverrideSimulationWarning(true)
                        setIsSimFailDialogOpened(false)
                        onSubmit()
                    }}
                    buttonLabel="Continue anyway"
                    cancelButton
                    cancelLabel="Back"
                    onCancel={() => setIsSimFailDialogOpened(false)}
                />
            )}
            <HardwareDeviceNotLinkedDialog
                onDone={resetDeviceLinkStatus}
                isOpen={isDeviceUnlinked}
                vendor={getDeviceFromAccountType(selectedAccount.accountType)}
                address={selectedAccount.address}
            />
            <RateUpdateDialog
                assetName={swapQuote.toToken.symbol}
                assetDecimals={toToken.decimals}
                rate={rate}
                threshold={advancedSettings.slippage}
            />
            {swapParameters && (
                <PriceImpactDialog
                    isOpen={isPriceImpactDialogOpened}
                    fromToken={{
                        token: swapParameters.fromToken,
                        amount: createTokenBigNumber(swapParameters.fromTokenAmount, swapParameters.fromToken.decimals),
                    }}
                    toToken={{
                        token: swapParameters.toToken,
                        amount: createTokenBigNumber(swapParameters.toTokenAmount, swapParameters.toToken.decimals),
                    }}
                    onClose={() => setIsPriceImpactDialogOpened(false)}
                    priceImpactPercentage={pricePercentageImpact}
                />
            )}

            <div className="flex flex-col px-6 py-3 h-full">
                <SwapAssetsDisplay
                    fromToken={fromToken}
                    toToken={toToken}
                    fromAmount={fromTokenAmount}
                    toAmount={createTokenBigNumber(
                        swapParameters?.toTokenAmount || swapQuote.toTokenAmount,
                        toTokenDecimals
                    )}
                />

                <SwapRateInfo
                    fromToken={fromToken}
                    toToken={toToken}
                    exchangeRate={exchangeRate}
                    usdValueDiff={usdValueDiff}
                    shouldWarnPriceDiff={shouldWarnPriceDiff}
                    onPriceDiffClick={() => setIsPriceDiffDialogOpened(true)}
                />
                <SwapSimulationDisplay
                    simulation={simulation}
                    simulationError={simulationError}
                    fromToken={fromToken}
                    toToken={toToken}
                    nativeToken={nativeToken.token}
                    exchangeRates={exchangeRates}
                    selectedAccountAddress={selectedAccount.address}
                />

                <p className="text-[13px] font-medium pb-1 pt-0.5 text-gray-700 dark:text-gray-300">
                    Gas Price
                </p>
                {isEIP1559Compatible ? (
                    <GasPriceComponent
                        defaultGas={{
                            defaultLevel: defaultGasOption || "medium",
                            feeData: {
                                gasLimit: defaultGas.gasLimit,
                            },
                        }}
                        setGas={(gasFees) => {
                            setSelectedGasLimit(gasFees.gasLimit!)
                            setSelectedFees({
                                maxFeePerGas: gasFees.maxFeePerGas!,
                                maxPriorityFeePerGas:
                                    gasFees.maxPriorityFeePerGas!,
                            })
                        }}
                        minGasLimit={
                            swapParameters
                                ? swapParameters.tx.gas.toString()
                                : undefined
                        }
                        isParentLoading={isGasLoading}
                        disabled={isGasLoading || !swapParameters}
                        displayOnlyMaxValue
                    />
                ) : (
                    <GasPriceSelector
                        defaultLevel={defaultGasOption || "medium"}
                        defaultGasLimit={defaultGas.gasLimit}
                        defaultGasPrice={defaultGas.gasPrice}
                        setGasPriceAndLimit={(gasPrice, gasLimit) => {
                            setSelectedGasPrice(gasPrice)
                            setSelectedGasLimit(gasLimit)
                        }}
                        isParentLoading={isGasLoading}
                        disabled={isGasLoading || !swapParameters}
                    />
                )}

                <div className="flex flex-row items-center py-3">
                    <div className="flex-1">
                        <AdvancedSettings
                            address={selectedAccount.address}
                            advancedSettings={advancedSettings}
                            display={{
                                nonce: true,
                                flashbots: true,
                                slippage: true,
                            }}
                            transactionGasLimit={selectedGasLimit}
                            setAdvancedSettings={(
                                newSettings: TransactionAdvancedData
                            ) => {
                                setAdvancedSettings({
                                    ...newSettings,
                                    slippage:
                                        newSettings.slippage !== undefined
                                            ? newSettings.slippage
                                            : defaultAdvancedSettings.slippage,
                                })
                            }}
                            label={"Settings"}
                            buttonClassName="h-12"
                        />
                    </div>
                    <div className="flex-1 ml-2">
                        <OutlinedButton
                            onClick={() => {
                                swapParameters && setShowDetails(true)
                            }}
                            className={classnames(
                                "!w-full h-12 space-x-2 p-4",
                                !swapParameters &&
                                "cursor-not-allowed hover:border-default"
                            )}
                        >
                            <span className="font-semibold text-sm">Details</span>
                            <Icon name={IconName.RIGHT_CHEVRON} size="sm" />
                        </OutlinedButton>
                    </div>
                </div>
                <div className="h-full flex flex-col justify-end space-y-3">
                    <SwapAlerts
                        errorMessage={errMessage}
                        priceImpactWarning={priceImpactWarning}
                        pricePercentageImpact={pricePercentageImpact}
                        shouldWarnPriceDiff={shouldWarnPriceDiff}
                        remainingSuffix={remainingSuffix}
                        isFetchingSwaps={isFetchingSwaps}
                        onPriceImpactClick={() => setIsPriceImpactDialogOpened(true)}
                        onPriceDiffClick={() => setIsPriceDiffDialogOpened(true)}
                    />
                </div>
            </div>
        </PopupLayout>
    )
}

export default SwapPageConfirm
