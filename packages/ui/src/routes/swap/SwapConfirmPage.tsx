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
} from "../../context/commActions"
import {
    SwapQuote,
    SwapParameters,
    SwapTransaction,
} from "@block-wallet/background/controllers/ExchangeController"
import {
    ExchangeType,
    HardwareWalletOpTypes,
    TransactionCategories,
} from "../../context/commTypes"
import {
    calcExchangeRate,
    isSwapNativeTokenAddress,
    populateExchangeTransaction,
} from "../../util/exchangeUtils"
import { BigNumber } from "ethers"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { GasPriceSelector } from "../../components/transactions/GasPriceSelector"
import { OneInchSwapRequestParams } from "@block-wallet/background/utils/types/1inch"
import {
    defaultSwapSettings,
    SwapSettings,
    SwapSettingsData,
} from "../../components/swaps/SwapSettings"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { classnames, Classes } from "../../styles"
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
import { useInProgressAllowanceTransaction } from "../../context/hooks/useInProgressAllowanceTransaction"
import LoadingDialog from "../../components/dialog/LoadingDialog"
import ClickableText from "../../components/button/ClickableText"
import Divider from "../../components/Divider"

export interface SwapConfirmPageLocalState {
    fromToken: Token
    swapQuote: SwapQuote
    toToken: Token
    amount?: string
}

// 15s
const QUOTE_REFRESH_TIMEOUT = 1000 * 15

const SwapPageConfirm: FC<{}> = () => {
    const history = useOnMountHistory()
    const { fromToken, swapQuote, toToken } = useMemo(
        () => history.location.state as SwapConfirmPageLocalState,
        [history.location.state]
    )

    const [timeoutStart, setTimeoutStart] = useState<number | undefined>(
        undefined
    )
    const { value: remainingSeconds } = useCountdown(
        timeoutStart,
        QUOTE_REFRESH_TIMEOUT
    )

    const [persistedData, setPersistedData] = useLocalStorageState(
        "swaps.confirm",
        {
            initialValue: {
                submitted: false,
            },
            volatile: true,
        }
    )

    const { clear: clearLocationRecovery } = useLocationRecovery()
    const { transaction: inProgressTransaction, clearTransaction } =
        useInProgressInternalTransaction({
            categories: [TransactionCategories.EXCHANGE],
        })

    const inProgressAllowanceTransaction = useInProgressAllowanceTransaction(
        fromToken.address
    )

    useEffect(() => {
        // Redirect to homepage if there is no pending transaction
        if (!inProgressTransaction?.id && persistedData.submitted) {
            history.push("/")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const { gasPricesLevels } = useGasPriceData()
    const { isEIP1559Compatible } = useSelectedNetwork()
    const selectedAccount = useSelectedAccount()
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

    const [isFetchingSwaps, setIsFetchingSwaps] = useState<boolean>(false)
    const [isGasLoading, setIsGasLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | undefined>(undefined)
    const [swapParameters, setSwapParameters] = useState<
        SwapParameters | undefined
    >(undefined)
    const [showDetails, setShowDetails] = useState<boolean>(false)
    const [selectedSwapSettings, setSelectedSwapSettings] =
        useState<SwapSettingsData>(defaultSwapSettings)

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

            setPersistedData({
                submitted: true,
            })

            const swapTransactionParams: SwapTransaction = {
                ...swapParameters,
                customNonce: selectedSwapSettings.customNonce,
                flashbots: selectedSwapSettings.flashbots,
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
            await executeExchange(
                ExchangeType.SWAP_1INCH,
                swapTransactionParams
            )
        } else {
            closeDialog()
        }
    }

    const updateSwapParameters = useCallback(async () => {
        setError(undefined)
        const params: OneInchSwapRequestParams = {
            fromAddress: selectedAccount.address,
            fromTokenAddress: swapQuote.fromToken.address,
            toTokenAddress: swapQuote.toToken.address,
            amount: swapQuote.fromTokenAmount,
            slippage: selectedSwapSettings.slippage,
        }

        setIsFetchingSwaps(true)
        try {
            const swapParams = await getExchangeParameters(
                ExchangeType.SWAP_1INCH,
                params
            )
            setSwapParameters(swapParams)
            setTimeoutStart(new Date().getTime())
        } catch (error) {
            setError(capitalize(error.message || "Error fetching swap"))
        } finally {
            setIsFetchingSwaps(false)
        }
    }, [
        selectedAccount.address,
        selectedSwapSettings.slippage,
        swapQuote.fromToken.address,
        swapQuote.fromTokenAmount,
        swapQuote.toToken.address,
    ])

    // Initialize gas
    useEffect(() => {
        const setGas = async () => {
            if (!swapParameters && error) {
                setIsGasLoading(false)
            }
            if (swapParameters && isGasInitialized.current === false) {
                setIsGasLoading(true)

                try {
                    let gasPrice: BigNumber = BigNumber.from(0)

                    if (!isEIP1559Compatible) {
                        gasPrice = await getLatestGasPrice()
                    }

                    setDefaultGas({
                        gasPrice: BigNumber.from(gasPrice),
                        gasLimit: BigNumber.from(swapParameters.tx.gas),
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
    }, [swapParameters, error])

    useEffect(() => {
        if (!shouldFetchSwapParams || inProgressAllowanceTransaction?.id) {
            setTimeoutStart(undefined)
            return
        }
        //first render, run function manually
        updateSwapParameters()
        let intervalRef = setInterval(
            updateSwapParameters,
            QUOTE_REFRESH_TIMEOUT
        )
        // Cleanup timer
        return () => {
            intervalRef && clearInterval(intervalRef)
        }
    }, [
        updateSwapParameters,
        shouldFetchSwapParams,
        inProgressAllowanceTransaction?.id,
    ])

    const remainingSuffix = Math.ceil(remainingSeconds!)
        ? `${Math.floor(remainingSeconds!)}s`
        : ""

    const rate = useMemo(() => {
        return BigNumber.from(
            swapParameters?.toTokenAmount || swapQuote.toTokenAmount
        )
    }, [swapParameters?.toTokenAmount, swapQuote.toTokenAmount])

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
                        label={
                            error
                                ? error
                                : hasBalance
                                ? `Swap`
                                : isSwappingNativeToken
                                ? "You don't have enough funds to cover the swap and the gas costs."
                                : "Insufficient funds"
                        }
                        isLoading={
                            error || !!inProgressAllowanceTransaction
                                ? false
                                : !swapParameters ||
                                  isGasLoading ||
                                  isFetchingSwaps ||
                                  isSwapping
                        }
                        onClick={onSubmit}
                        disabled={!!error || !hasBalance}
                        buttonClass={classnames(
                            error || !hasBalance
                                ? `${Classes.redButton} opacity-100`
                                : ""
                        )}
                    />
                </PopupFooter>
            }
        >
            <LoadingDialog
                open={!!inProgressAllowanceTransaction}
                title={"Waiting for pending transactions..."}
                message={
                    <div className="flex flex-col space-y-2 items-center">
                        <span>
                            You will not be able to initiate the swap until the
                            allowance transaction is mined.
                        </span>
                        <Divider />
                        <span className="text-xs">
                            You can wait here until it is done
                        </span>
                        <div className="mt-1 text-xs">
                            <span>
                                <i>OR</i>
                            </span>
                            <br />
                            <ClickableText onClick={() => history.push("/")}>
                                Return to the home page
                            </ClickableText>
                        </div>
                    </div>
                }
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
                timeout={2900}
                gifs={gifs}
                onDone={React.useCallback(() => {
                    if (status === "error") {
                        closeDialog()
                        setPersistedData({
                            submitted: false,
                        })
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
            />
            {swapParameters && (
                <TransactionDetails
                    transaction={populateExchangeTransaction(swapParameters)}
                    open={showDetails}
                    onClose={() => setShowDetails(false)}
                    nonce={selectedSwapSettings.customNonce}
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
                threshold={selectedSwapSettings.slippage}
            />
            <div className="flex flex-col px-6 py-3">
                {/* From Token */}
                <AssetAmountDisplay
                    asset={fromToken}
                    amount={BigNumber.from(
                        swapParameters?.fromTokenAmount ||
                            swapQuote.fromTokenAmount
                    )}
                />

                {/* Divider */}
                <div className="pt-8">
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
                <p className="text-sm py-2 leading-loose text-gray-500 uppercase text-center w-full">
                    {`1 ${fromToken.symbol} = ${formatNumberLength(
                        formatRounded(exchangeRate.toFixed(10), 8),
                        10
                    )} ${toToken.symbol}`}
                </p>

                {/* Gas */}
                <p className="text-sm text-gray-600 pb-2 pt-1">Gas Price</p>
                {isEIP1559Compatible ? (
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
                                maxPriorityFeePerGas:
                                    gasFees.maxPriorityFeePerGas!,
                            })
                        }}
                        isParentLoading={isGasLoading}
                        disabled={isGasLoading}
                        displayOnlyMaxValue
                    />
                ) : (
                    <GasPriceSelector
                        defaultGasLimit={defaultGas.gasLimit}
                        defaultGasPrice={defaultGas.gasPrice}
                        setGasPriceAndLimit={(gasPrice, gasLimit) => {
                            setSelectedGasPrice(gasPrice)
                            setSelectedGasLimit(gasLimit)
                        }}
                        isParentLoading={isGasLoading}
                        disabled={isGasLoading}
                    />
                )}

                <div className="flex flex-row space-x-2 items-center py-3">
                    {/* Swap Settings */}
                    <SwapSettings
                        address={selectedAccount.address}
                        swapSettings={selectedSwapSettings}
                        setSwapSettings={setSelectedSwapSettings}
                    />
                    {/* Swap Details */}
                    <OutlinedButton
                        onClick={() => {
                            swapParameters && setShowDetails(true)
                        }}
                        className={classnames(
                            "w-full",
                            !swapParameters &&
                                "cursor-not-allowed hover:border-default"
                        )}
                    >
                        <span className="font-bold text-sm">Details</span>
                        <Icon name={IconName.RIGHT_CHEVRON} size="sm" />
                    </OutlinedButton>
                </div>

                {remainingSuffix && (
                    <RefreshLabel value={remainingSuffix} className="mt-3" />
                )}
            </div>
        </PopupLayout>
    )
}

export default SwapPageConfirm
