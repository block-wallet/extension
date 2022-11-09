import AssetAmountDisplay from "../../components/assets/AssetAmountDisplay"
import ClickableText from "../../components/button/ClickableText"
import Divider from "../../components/Divider"
import GasPriceComponent from "../../components/transactions/GasPriceComponent"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import LoadingDialog from "../../components/dialog/LoadingDialog"
import NetworkDisplay from "../../components/network/NetworkDisplay"
import NetworkDisplayBadge from "../../components/chain/NetworkDisplayBadge"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import WaitingDialog from "../../components/dialog/WaitingDialog"
import arrowDown from "../../assets/images/icons/arrow_down_long.svg"
import useCheckAccountDeviceLinked from "../../util/hooks/useCheckAccountDeviceLinked"
import useLocalStorageState from "../../util/hooks/useLocalStorageState"
import { BigNumber } from "ethers"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { GasPriceSelector } from "../../components/transactions/GasPriceSelector"
import {
    HardwareWalletOpTypes,
    QuoteFeeStatus,
    TransactionCategories,
} from "../../context/commTypes"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { classnames, Classes } from "../../styles"
import { getDeviceFromAccountType } from "../../util/hardwareDevice"
import {
    executeBridge,
    getBridgeQuote,
    getLatestGasPrice,
    rejectTransaction,
} from "../../context/commActions"
import {
    isBridgeNativeTokenAddress,
    populateBridgeTransaction,
    isANotFoundQuote,
    getBridgeWarningMessages,
} from "../../util/bridgeUtils"
import { isHardwareWallet } from "../../util/account"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import { useHasSufficientBalance } from "../../context/hooks/useHasSufficientBalance"
import { useInProgressAllowanceTransaction } from "../../context/hooks/useInProgressAllowanceTransaction"
import { useInProgressInternalTransaction } from "../../context/hooks/useInProgressInternalTransaction"
import { useUserSettings } from "../../context/hooks/useUserSettings"
import { useLocationRecovery } from "../../util/hooks/useLocationRecovery"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import {
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
    FunctionComponent,
} from "react"
import { useTokensList } from "../../context/hooks/useTokensList"
import { useTransactionWaitingDialog } from "../../context/hooks/useTransactionWaitingDialog"
import { IBridgeRoute } from "@block-wallet/background/utils/bridgeApi"
import { IChain } from "@block-wallet/background/utils/types/chain"
import useCountdown from "../../util/hooks/useCountdown"
import OutlinedButton from "../../components/ui/OutlinedButton"
import { TransactionAdvancedData } from "@block-wallet/background/controllers/transactions/utils/types"
import {
    AdvancedSettings,
    defaultAdvancedSettings,
} from "../../components/transactions/AdvancedSettings"
import Icon, { IconName } from "../../components/ui/Icon"
import RefreshLabel from "../../components/swaps/RefreshLabel"
import {
    BridgeQuoteRequest,
    BridgeTransaction,
    GetBridgeQuoteResponse,
    GetBridgeQuoteNotFoundResponse,
} from "@block-wallet/background/controllers/BridgeController"
import { capitalize } from "../../util/capitalize"
import TransactionDetails from "../../components/transactions/TransactionDetails"
import { WithRequired } from "@block-wallet/background/utils/types/helpers"
import CollapsableWarning from "../../components/CollapsableWarning"
import { AiOutlineWarning } from "react-icons/ai"
import BridgeDetails from "../../components/bridge/BridgeDetails"
import ErrorMessage from "../../components/error/ErrorMessage"
import BridgeErrorMessage, { BridgeErrorType } from "./BridgeErrorMessage"
import BridgeNotFoundQuoteDetails from "../../components/transactions/BridgeNotFoundQuoteDetails"
import { useSelectedAccountHasEnoughNativeTokensToSend } from "../../context/hooks/useSelectedAccountHasEnoughNativeTokensToSend"
import { isNativeTokenAddress } from "../../util/tokenUtils"

export interface BridgeConfirmPageLocalState {
    amount: string
    bridgeQuote: GetBridgeQuoteResponse
    network: IChain
    routes: IBridgeRoute[]
    token: Token
    fromAssetPage?: boolean
}

// 15s
const QUOTE_REFRESH_TIMEOUT = 1000 * 20

const BridgeConfirmPage: FunctionComponent<{}> = () => {
    const history = useOnMountHistory()
    const { bridgeQuote, network, token } = useMemo(
        () => history.location.state as BridgeConfirmPageLocalState,
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
        "bridge.confirm",
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
            categories: [TransactionCategories.BRIDGE],
        })
    const inProgressAllowanceTransaction = useInProgressAllowanceTransaction(
        token.address
    )

    useEffect(() => {
        // Redirect to homepage if there is no pending transaction
        if (!inProgressTransaction?.id && persistedData.submitted) {
            history.push("/")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const { availableNetworks, selectedNetwork } = useBlankState()!
    const { gasPricesLevels } = useGasPriceData()
    const { isEIP1559Compatible } = useSelectedNetwork()
    const selectedAccount = useSelectedAccount()
    const { nativeToken } = useTokensList()

    const [quoteNotFoundErrors, setQuoteNotFoundErrors] = useState<
        GetBridgeQuoteNotFoundResponse | undefined
    >(undefined)

    const [showBridgeNotFoundQuoteDetails, setShowBridgeNotFoundQuoteDetails] =
        useState<boolean>(false)
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
                reject: useCallback(() => {
                    if (inProgressTransaction?.id) {
                        rejectTransaction(inProgressTransaction?.id)
                    }
                }, [inProgressTransaction?.id]),
            }
        )

    const [isFetchingParams, setIsFetchingParams] = useState<boolean>(false)
    const [isGasLoading, setIsGasLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | undefined>(undefined)
    const [bridgeQuoteError, setBridgeQuoteError] = useState<
        BridgeErrorType | undefined
    >()
    const [bridgeDetailsModal, setBridgeDetailsModal] = useState<{
        isOpen: boolean
        tab?: "summary" | "fees"
    }>({
        isOpen: false,
        tab: "summary",
    })

    const [advancedSettings, setAdvancedSettings] = useState<
        WithRequired<TransactionAdvancedData, "slippage">
    >(defaultAdvancedSettings)
    const [quote, setQuote] = useState<GetBridgeQuoteResponse | undefined>(
        bridgeQuote
    )
    const { fromAmount, fromToken, transactionRequest, toChainId, toToken } =
        bridgeQuote.bridgeParams.params
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
    const [selectedGasLimit, setSelectedGasLimit] = useState(
        BigNumber.from(transactionRequest.gasLimit || 0)
    )

    const isBridging = status === "loading" && isOpen
    const shouldFetchBridgeParams = status !== "loading" && status !== "success"
    const isGasInitialized = useRef<boolean>(false)
    const remainingSuffix = Math.ceil(remainingSeconds!)
        ? `${Math.floor(remainingSeconds!)}s`
        : ""
    const networkLabel = availableNetworks[selectedNetwork.toUpperCase()]

    // Balance check
    const feePerGas = isEIP1559Compatible
        ? selectedFees.maxFeePerGas
        : selectedGasPrice

    const fee = selectedGasLimit.mul(feePerGas)

    const isBridgingNativeToken = isBridgeNativeTokenAddress(token.address)
    const total = isBridgingNativeToken
        ? BigNumber.from(
              quote?.bridgeParams.params.fromAmount || fromAmount
          ).add(fee)
        : fee

    const hasNativeAssetBalance = useHasSufficientBalance(
        total,
        nativeToken.token
    )
    const hasFromTokenBalance = useHasSufficientBalance(
        BigNumber.from(quote?.bridgeParams.params.fromAmount || fromAmount),
        token
    )

    const hasBalance = isBridgingNativeToken
        ? hasNativeAssetBalance
        : hasNativeAssetBalance && hasFromTokenBalance

    useEffect(() => {
        if (!hasBalance) {
            if (!error) {
                setError(
                    "You don't have enough balance to cover the bridge and the gas costs"
                )
            }
        } else {
            setError(undefined)
        }
    }, [hasBalance, quote])

    const { hideBridgeInsufficientNativeTokenWarning } = useUserSettings()
    const {
        isLoading: isLoadingSelectedAccountHasEnoughNativeTokensToSend,
        result: selectedAccountNativeTokensInDestinationNetwork,
        check: checkSelectedAccountHasEnoughNativeTokensToSend,
    } = useSelectedAccountHasEnoughNativeTokensToSend(toChainId)

    const destinationTokenIsNative = isNativeTokenAddress(toToken.address)
    const destinationNetwork = Object.values(availableNetworks).find(
        (n) => n.chainId === toChainId
    )

    const checkNativeTokensInDestinationNetwork =
        !hideBridgeInsufficientNativeTokenWarning && !destinationTokenIsNative

    useEffect(() => {
        if (checkNativeTokensInDestinationNetwork) {
            checkSelectedAccountHasEnoughNativeTokensToSend()
        }
    }, [])

    const idleScreen =
        !inProgressAllowanceTransaction?.id && !inProgressTransaction?.id
    const bridgeWarningMessage =
        checkNativeTokensInDestinationNetwork &&
        !isLoadingSelectedAccountHasEnoughNativeTokensToSend &&
        !!selectedAccountNativeTokensInDestinationNetwork
            ? getBridgeWarningMessages(
                  selectedAccountNativeTokensInDestinationNetwork,
                  destinationNetwork
              )
            : undefined

    const showBridgeWarningMessage = idleScreen && !!bridgeWarningMessage

    const onSubmit = async () => {
        if (error || !quote || bridgeQuoteError) return

        dispatch({ type: "open", payload: { status: "loading" } })
        const isLinked = await checkDeviceIsLinked()
        if (isLinked) {
            if (!isHardwareWallet(selectedAccount.accountType)) {
                clearLocationRecovery()
            }

            setPersistedData({
                submitted: true,
            })

            const txParams: BridgeTransaction = {
                ...quote.bridgeParams,
                customNonce: advancedSettings.customNonce,
                flashbots: advancedSettings.flashbots,
                gasPrice: isEIP1559Compatible
                    ? undefined
                    : selectedGasPrice ||
                      BigNumber.from(
                          quote.bridgeParams.params.transactionRequest.gasLimit
                      ),
                maxPriorityFeePerGas: isEIP1559Compatible
                    ? selectedFees.maxPriorityFeePerGas
                    : undefined,
                maxFeePerGas: isEIP1559Compatible
                    ? selectedFees.maxFeePerGas
                    : undefined,
            }

            await executeBridge(txParams)
        } else {
            closeDialog()
        }
    }

    // Initialize gas
    useEffect(() => {
        const setGas = async () => {
            if (!quote && error) {
                setIsGasLoading(false)
            }

            if (quote && isGasInitialized.current === false) {
                setIsGasLoading(true)

                try {
                    let gasPrice: BigNumber = BigNumber.from(0)

                    if (!isEIP1559Compatible) {
                        gasPrice = await getLatestGasPrice()
                    }

                    setDefaultGas({
                        gasPrice: BigNumber.from(gasPrice),
                        gasLimit: BigNumber.from(
                            quote.bridgeParams.params.transactionRequest
                                .gasLimit
                        ),
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
    }, [quote, error])

    useEffect(() => {
        let isValidFetch = true
        let timeoutRef: NodeJS.Timeout | null = null
        if (!shouldFetchBridgeParams || inProgressAllowanceTransaction?.id) {
            setTimeoutStart(undefined)
            return
        }

        async function fetchQuoteParams() {
            setError(undefined)
            setBridgeQuoteError(undefined)
            const params: BridgeQuoteRequest = {
                toChainId: toChainId,
                fromTokenAddress: fromToken.address,
                toTokenAddress: toToken.address,
                fromAmount: fromAmount,
                fromAddress: selectedAccount.address,
                slippage: advancedSettings.slippage,
            }

            setIsFetchingParams(true)
            let errorType: BridgeErrorType | undefined
            let fetchedQuote:
                | GetBridgeQuoteResponse
                | GetBridgeQuoteNotFoundResponse
                | undefined
            let validQuote: GetBridgeQuoteResponse | undefined
            let invalidQuote: GetBridgeQuoteNotFoundResponse | undefined
            try {
                fetchedQuote = await getBridgeQuote(params)
                if (isANotFoundQuote(fetchedQuote)) {
                    errorType = BridgeErrorType.QUOTE_NOT_FOUND
                    invalidQuote =
                        fetchedQuote as GetBridgeQuoteNotFoundResponse
                } else {
                    validQuote = fetchedQuote as GetBridgeQuoteResponse
                    if (validQuote.quoteFeeStatus !== QuoteFeeStatus.OK) {
                        errorType =
                            BridgeErrorType.INSUFFICIENT_BALANCE_TO_COVER_FEES
                    }
                }
            } catch (error) {
                errorType = BridgeErrorType.OTHER
            } finally {
                //in case the effect was unmounted after invoking the background
                if (isValidFetch) {
                    setTimeoutStart(
                        fetchedQuote ? new Date().getTime() : undefined
                    )
                    setQuote(validQuote)
                    setQuoteNotFoundErrors(invalidQuote)
                    setIsFetchingParams(false)
                    setBridgeQuoteError(errorType)
                }
            }
        }

        //first render, run function manually
        async function fetchParams() {
            await fetchQuoteParams()
            timeoutRef = setTimeout(fetchParams, QUOTE_REFRESH_TIMEOUT)
        }

        fetchParams()

        // Cleanup timer
        return () => {
            isValidFetch = false
            timeoutRef && clearTimeout(timeoutRef)
        }
    }, [
        advancedSettings.slippage,
        fromAmount,
        fromToken.address,
        toChainId,
        toToken.address,
        inProgressAllowanceTransaction?.id,
        selectedAccount.address,
        shouldFetchBridgeParams,
    ])

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Bridge"
                    close="/"
                    onBack={() => {
                        // Avoid returning to the approve page.
                        history.push({
                            pathname: "/bridge",
                            state: history.location.state,
                        })
                    }}
                    disabled={isBridging}
                >
                    <div className="flex grow justify-end pr-1">
                        <NetworkDisplayBadge network={networkLabel} truncate />
                    </div>
                </PopupHeader>
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Bridge"
                        isLoading={
                            error || !!inProgressAllowanceTransaction
                                ? false
                                : !quote ||
                                  isGasLoading ||
                                  isFetchingParams ||
                                  isBridging ||
                                  !!isLoadingSelectedAccountHasEnoughNativeTokensToSend
                        }
                        onClick={onSubmit}
                        disabled={!!error || !!bridgeQuoteError}
                    />
                </PopupFooter>
            }
        >
            <LoadingDialog
                open={!!inProgressAllowanceTransaction}
                title={"Waiting for allowance transaction..."}
                message={
                    <div className="flex flex-col space-y-2 items-center">
                        <span>Your bridge is being prepared, please wait.</span>
                        <Divider />
                        <span className="text-xs">
                            {"You can wait here until it is done or "}
                            <ClickableText onClick={() => history.push("/")}>
                                bridge later
                            </ClickableText>
                            {" when the token approval is completed."}
                        </span>
                    </div>
                }
            />
            <WaitingDialog
                open={isOpen}
                status={status}
                titles={{
                    loading: titles?.loading || "Bridging...",
                    success: titles?.success || "Success",
                    error: titles?.error || "Error",
                }}
                texts={{
                    loading: texts?.loading || "Initiating the bridging...",
                    success: titles?.success || "You've initiated the bridging",
                    error: texts?.error || "Error bridging",
                }}
                clickOutsideToClose={false}
                txHash={inProgressTransaction?.transactionParams.hash}
                timeout={2900}
                gifs={gifs}
                onDone={useCallback(() => {
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
            {quote && (
                <BridgeDetails
                    transaction={populateBridgeTransaction(quote)}
                    open={bridgeDetailsModal.isOpen}
                    onClose={() => setBridgeDetailsModal({ isOpen: false })}
                    nonce={advancedSettings.customNonce}
                    tab={bridgeDetailsModal.tab}
                />
            )}
            <HardwareDeviceNotLinkedDialog
                onDone={resetDeviceLinkStatus}
                isOpen={isDeviceUnlinked}
                vendor={getDeviceFromAccountType(selectedAccount.accountType)}
                address={selectedAccount.address}
            />
            {showBridgeWarningMessage && (
                <CollapsableWarning
                    isCollapsedByDefault={false}
                    collapsedMessage={
                        <div
                            className={classnames(
                                "text-center opacity-90 w-full p-2 bg-yellow-200 hover:bg-yellow-100 space-x-2 flex tems-center font-bold justify-center"
                            )}
                        >
                            <AiOutlineWarning className="w-4 h-4 yellow-300" />
                            <span className="font-bold">
                                {bridgeWarningMessage.title}
                            </span>
                        </div>
                    }
                    dialog={{
                        title: bridgeWarningMessage.title,
                        message: (
                            <div>
                                <span>{bridgeWarningMessage.body}</span>
                            </div>
                        ),
                    }}
                />
            )}
            <div className="flex flex-col px-6 py-3">
                {/* From Token */}
                <AssetAmountDisplay
                    asset={token}
                    amount={BigNumber.from(fromAmount)}
                />

                {/* Divider */}
                <div className="pt-6">
                    <hr className="-mx-5" />
                    <div className="flex -translate-y-2/4 justify-center items-center mx-auto rounded-full w-8 h-8 border border-grey-200 bg-white z-10">
                        <img
                            src={arrowDown}
                            className="h-4 w-auto mx-auto"
                            alt="arrow"
                        />
                    </div>
                </div>

                {/* To */}
                <div className="-mt-2">
                    <AssetAmountDisplay
                        asset={toToken}
                        amount={
                            quote &&
                            BigNumber.from(quote.bridgeParams.params.toAmount)
                        }
                    />
                </div>

                <div className="py-1">
                    <NetworkDisplay network={network} />
                </div>

                {/* Gas */}
                <p className="text-sm text-gray-600 pt-1 pb-2">Gas Price</p>
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

                <div className="flex flex-row items-center pt-2">
                    {/* Settings */}
                    <AdvancedSettings
                        address={selectedAccount.address}
                        advancedSettings={advancedSettings}
                        display={{
                            nonce: true,
                            flashbots: true,
                            slippage: true,
                        }}
                        setAdvancedSettings={(
                            newSettings: TransactionAdvancedData
                        ) => {
                            setAdvancedSettings({
                                ...newSettings,
                                slippage:
                                    newSettings.slippage ||
                                    defaultAdvancedSettings.slippage,
                            })
                        }}
                        label={"Settings"}
                    />
                    {/* Details */}
                    <OutlinedButton
                        onClick={() => {
                            quote &&
                                setBridgeDetailsModal({
                                    isOpen: true,
                                    tab: "summary",
                                })
                        }}
                        className={classnames(
                            "w-full ml-2",
                            !quote && "cursor-not-allowed hover:border-default"
                        )}
                    >
                        <span className="font-bold text-sm">Details</span>
                        <Icon name={IconName.RIGHT_CHEVRON} size="sm" />
                    </OutlinedButton>
                </div>
                {!!quoteNotFoundErrors && (
                    <BridgeNotFoundQuoteDetails
                        open={showBridgeNotFoundQuoteDetails}
                        onClose={() => setShowBridgeNotFoundQuoteDetails(false)}
                        details={quoteNotFoundErrors}
                    />
                )}
                {bridgeQuoteError && (
                    <BridgeErrorMessage
                        type={bridgeQuoteError}
                        onClickDetails={(type) => {
                            if (
                                type ===
                                BridgeErrorType.INSUFFICIENT_BALANCE_TO_COVER_FEES
                            ) {
                                setBridgeDetailsModal({
                                    isOpen: true,
                                    tab: "fees",
                                })
                            }

                            if (type === BridgeErrorType.QUOTE_NOT_FOUND) {
                                setShowBridgeNotFoundQuoteDetails(true)
                            }
                        }}
                        className="mt-1"
                    />
                )}
                {/** Only display custom errors if there isn't a quote error already. */}
                {error && !bridgeQuoteError && (
                    <ErrorMessage className="mt-2">{error}</ErrorMessage>
                )}
                {remainingSuffix &&
                    !isFetchingParams &&
                    !error &&
                    bridgeQuote && (
                        <RefreshLabel
                            value={remainingSuffix}
                            className="pt-4"
                        />
                    )}
            </div>
        </PopupLayout>
    )
}

export default BridgeConfirmPage
