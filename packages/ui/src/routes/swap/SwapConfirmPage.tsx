import AssetAmountDisplay from "../../components/assets/AssetAmountDisplay"
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
    useRef,
    FC,
    useCallback,
    useLayoutEffect,
} from "react"
import TransactionDetails from "../../components/transactions/TransactionDetails"
import WaitingDialog from "../../components/dialog/WaitingDialog"
import arrowDown from "../../assets/images/icons/arrow_down_long.svg"
import useCheckAccountDeviceLinked from "../../util/hooks/useCheckAccountDeviceLinked"
import useLocalStorageState from "../../util/hooks/useLocalStorageState"
import {
    getExchangeParameters,
    executeExchange,
    getLatestGasPrice,
    rejectTransaction,
    getSwapTransactionGasLimit,
} from "../../context/commActions"
import {
    SwapParameters,
    SwapQuoteResponse,
    SwapRequestParams,
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
    isSwapNativeTokenAddress,
    populateExchangeTransaction,
} from "../../util/exchangeUtils"
import { BigNumber } from "@ethersproject/bignumber"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { GasPriceSelector } from "../../components/transactions/GasPriceSelector"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { classnames } from "../../styles"
import { formatRounded } from "../../util/formatRounded"
import { getDeviceFromAccountType } from "../../util/hardwareDevice"
import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import { useHasSufficientBalance } from "../../context/hooks/useHasSufficientBalance"
import { useInProgressInternalTransaction } from "../../context/hooks/useInProgressInternalTransaction"
import { useLocationRecovery } from "../../util/hooks/useLocationRecovery"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useTransactionWaitingDialog } from "../../context/hooks/useTransactionWaitingDialog"
import { useTokensList } from "../../context/hooks/useTokensList"
import { isHardwareWallet } from "../../util/account"
import useCountdown from "../../util/hooks/useCountdown"
import { formatNumberLength } from "../../util/formatNumberLength"
import OutlinedButton from "../../components/ui/OutlinedButton"
import Icon, { IconName } from "../../components/ui/Icon"
import RefreshLabel from "../../components/swaps/RefreshLabel"
import { capitalize } from "../../util/capitalize"
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
import ErrorMessage from "../../components/error/ErrorMessage"
import Alert from "../../components/ui/Alert"
import PriceImpactDialog from "../../components/swaps/PriceImpactDialog"

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

// 15s
const QUOTE_REFRESH_TIMEOUT = 1000 * 15
const PRICE_IMPACT_THRESHOLD = 0.1

const SwapPageConfirm: FC<{}> = () => {
    const history = useOnMountHistory()
    const { exchangeRates } = useBlankState()!
    const { fromToken, swapQuote, toToken, allowanceTransactionId } = useMemo(
        () => history.location.state as SwapConfirmPageLocalState,
        [history.location.state]
    )
    const [isPriceImpactDialogOpened, setIsPriceImpactDialogOpened] =
        useState<boolean>(false)
    const [timeoutStart, setTimeoutStart] = useState<number | undefined>(
        undefined
    )
    const { value: remainingSeconds } = useCountdown(
        timeoutStart,
        QUOTE_REFRESH_TIMEOUT
    )

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inProgressTransaction?.id])

    useLayoutEffect(() => {
        // Redirect to homepage if there is no pending transaction
        if (
            !inProgressTransaction?.id &&
            persistedData.submitted &&
            !persistedData.txId
        ) {
            history.push("/")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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

    const [isFetchingSwaps, setIsFetchingSwaps] = useState<boolean>(false)
    const [isGasLoading, setIsGasLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | undefined>(undefined)
    const [swapParameters, setSwapParameters] = useState<
        SwapParameters | undefined
    >(undefined)
    const [showDetails, setShowDetails] = useState<boolean>(false)
    const [advancedSettings, setAdvancedSettings] = useState<
        WithRequired<TransactionAdvancedData, "slippage">
    >(defaultAdvancedSettings)

    const pricePercentageImpact = useMemo(() => {
        if (swapParameters) {
            return calculatePricePercentageImpact(
                exchangeRates,
                {
                    token: swapParameters.fromToken,
                    amount: BigNumber.from(swapParameters.fromTokenAmount ?? 0),
                },
                {
                    token: swapParameters.toToken,
                    amount: BigNumber.from(swapParameters.toTokenAmount ?? 0),
                }
            )
        }
        return undefined
    }, [swapParameters, exchangeRates])

    // Gas
    const [defaultGas, setDefaultGas] = useState<{
        gasPrice: BigNumber
        gasLimit: BigNumber
    }>({
        gasPrice: BigNumber.from(gasPricesLevels.average.gasPrice ?? "0"),
        gasLimit: BigNumber.from(0),
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
    const [selectedGasLimit, setSelectedGasLimit] = useState(BigNumber.from(0))

    const isSwapping = status === "loading" && isOpen
    const shouldFetchSwapParams = status !== "loading" && status !== "success"
    const isGasInitialized = useRef<boolean>(false)

    // Balance check
    const feePerGas = isEIP1559Compatible
        ? selectedFees.maxFeePerGas
        : selectedGasPrice

    const fee = selectedGasLimit.mul(feePerGas)
    const isSwappingNativeToken = isSwapNativeTokenAddress(
        swapParameters?.fromToken.address || swapQuote.fromToken.address
    )
    const total = isSwappingNativeToken
        ? BigNumber.from(
              swapParameters?.fromTokenAmount || swapQuote.fromTokenAmount
          ).add(fee)
        : fee

    const hasNativeAssetBalance = useHasSufficientBalance(
        total,
        nativeToken.token
    )

    const hasFromTokenBalance = useHasSufficientBalance(
        BigNumber.from(
            swapParameters?.fromTokenAmount || swapQuote.fromTokenAmount
        ),
        fromToken
    )

    const hasBalance = isSwappingNativeToken
        ? hasNativeAssetBalance
        : hasNativeAssetBalance && hasFromTokenBalance

    const exchangeRate = calcExchangeRate(
        BigNumber.from(
            swapParameters?.fromTokenAmount || swapQuote.fromTokenAmount
        ),
        fromToken.decimals,
        BigNumber.from(
            swapParameters?.toTokenAmount || swapQuote.toTokenAmount
        ),
        toToken.decimals
    )

    const onSubmit = async () => {
        if (error || !swapParameters || !hasBalance) return

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

    const updateSwapParameters = useCallback(async () => {
        setError(undefined)
        setIsFetchingSwaps(true)
        const params: SwapRequestParams = {
            fromAddress: selectedAccount.address,
            fromToken: swapQuote.fromToken,
            toToken: swapQuote.toToken,
            amount: swapQuote.fromTokenAmount,
            slippage: advancedSettings.slippage,
        }
        try {
            const swapParams = await getExchangeParameters(
                DEFAULT_EXCHANGE_TYPE,
                params
            )
            setSwapParameters(swapParams)
        } catch (error) {
            setError(capitalize(error.message || "Error fetching swap"))
        } finally {
            setTimeoutStart(new Date().getTime())
            setIsFetchingSwaps(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        selectedAccount.address,
        advancedSettings.slippage,
        swapQuote.fromToken.address,
        swapQuote.fromTokenAmount,
        swapQuote.toToken.address,
    ])

    // Initialize gas
    useEffect(() => {
        const setGas = async () => {
            if ((!swapParameters && error) || !hasBalance) {
                setIsGasLoading(false)
            }
            if (swapParameters && isGasInitialized.current === false) {
                setIsGasLoading(true)

                try {
                    let gasPrice: BigNumber = BigNumber.from(0)

                    if (!isEIP1559Compatible) {
                        gasPrice = await getLatestGasPrice()
                    }

                    let gasLimitEstimation = await getSwapTransactionGasLimit(
                        swapParameters.tx
                    )

                    setDefaultGas({
                        gasPrice: BigNumber.from(gasPrice),
                        gasLimit: BigNumber.from(gasLimitEstimation.gasLimit),
                    })

                    isGasInitialized.current = true
                } catch (error) {
                    setError("Error fetching gas default")
                } finally {
                    setIsGasLoading(false)
                }
            }
        }

        setGas()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [swapParameters, error, hasBalance])

    useEffect(() => {
        if (!shouldFetchSwapParams || isInProgressAllowanceTransaction) {
            setTimeoutStart(undefined)
            return
        }

        let timeoutRef: ReturnType<typeof setTimeout>

        async function fetchParams() {
            await updateSwapParameters()
            timeoutRef = setTimeout(fetchParams, QUOTE_REFRESH_TIMEOUT)
        }

        fetchParams()

        // Cleanup timer
        return () => {
            timeoutRef && clearTimeout(timeoutRef)
        }
    }, [
        updateSwapParameters,
        shouldFetchSwapParams,
        isInProgressAllowanceTransaction,
    ])

    const remainingSuffix = Math.ceil(remainingSeconds!)
        ? `${Math.floor(remainingSeconds!)}s`
        : ""

    const rate = useMemo(() => {
        return BigNumber.from(
            swapParameters?.toTokenAmount || swapQuote.toTokenAmount
        )
    }, [swapParameters?.toTokenAmount, swapQuote.toTokenAmount])

    let errMessage = error

    //Override to custom error.
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
                        //avoid returning to the "approve page".
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
                        amount: BigNumber.from(swapParameters.fromTokenAmount),
                    }}
                    toToken={{
                        token: swapParameters.toToken,
                        amount: BigNumber.from(swapParameters.toTokenAmount),
                    }}
                    onClose={() => setIsPriceImpactDialogOpened(false)}
                    priceImpactPercentage={pricePercentageImpact}
                />
            )}

            <div className="flex flex-col px-6 py-3 h-full">
                {/* From Token */}
                <AssetAmountDisplay
                    asset={fromToken}
                    amount={BigNumber.from(
                        swapParameters?.fromTokenAmount ||
                            swapQuote.fromTokenAmount
                    )}
                />

                {/* Divider */}
                <div className="pt-5">
                    <hr className="-mx-5" />
                    <div className="flex -translate-y-2/4 justify-center items-center mx-auto rounded-full w-8 h-8 border border-grey-200 bg-white z-10">
                        <img
                            src={arrowDown}
                            className="h-4 w-auto mx-auto"
                            alt="arrow"
                        />
                    </div>
                </div>

                {/* To Token */}
                <AssetAmountDisplay
                    asset={toToken}
                    amount={BigNumber.from(
                        swapParameters?.toTokenAmount || swapQuote.toTokenAmount
                    )}
                />

                {/* Rates */}
                <p className="text-sm py-1 leading-loose text-primary-grey-dark uppercase text-center w-full">
                    {`1 ${fromToken.symbol} = ${formatNumberLength(
                        formatRounded(exchangeRate.toFixed(10), 8),
                        10
                    )} ${toToken.symbol}`}
                </p>

                {/* Gas */}
                <p className="text-[13px] font-medium pb-1 pt-0.5 text-primary-grey-dark">
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
                    {/* Settings */}
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
                    />
                    {/* Swap Details */}
                    <OutlinedButton
                        onClick={() => {
                            swapParameters && setShowDetails(true)
                        }}
                        className={classnames(
                            "!w-full ml-2 h-12 space-x-2 p-4 ",
                            !swapParameters &&
                                "cursor-not-allowed hover:border-default"
                        )}
                    >
                        <span className="font-semibold text-sm">Details</span>
                        <Icon name={IconName.RIGHT_CHEVRON} size="sm" />
                    </OutlinedButton>
                </div>
                <div className="h-full flex flex-col justify-end space-y-3">
                    {isFetchingSwaps ? (
                        <div />
                    ) : (
                        <>
                            {errMessage ? (
                                <ErrorMessage>{errMessage}</ErrorMessage>
                            ) : priceImpactWarning ? (
                                <Alert
                                    type="warn"
                                    className={classnames(
                                        "p-2",
                                        "font-semibold",
                                        "cursor-pointer hover:opacity-50",
                                        "text-left"
                                    )}
                                    onClick={() =>
                                        setIsPriceImpactDialogOpened(true)
                                    }
                                >
                                    <span>
                                        {pricePercentageImpact ? (
                                            <span>
                                                High price impact! More than{" "}
                                                {(
                                                    pricePercentageImpact * 100
                                                ).toFixed(2)}
                                                % loss
                                            </span>
                                        ) : (
                                            <span>
                                                Unable to calculate the price
                                                impact
                                            </span>
                                        )}
                                    </span>
                                </Alert>
                            ) : null}
                            {remainingSuffix && (
                                <RefreshLabel
                                    value={remainingSuffix}
                                    className="pb-1"
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </PopupLayout>
    )
}

export default SwapPageConfirm
