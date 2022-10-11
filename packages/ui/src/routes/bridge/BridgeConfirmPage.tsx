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
    getWarningMessages,
} from "../../util/bridgeUtils"
import { isHardwareWallet } from "../../util/account"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import { useHasSufficientBalance } from "../../context/hooks/useHasSufficientBalance"
import { useInProgressAllowanceTransaction } from "../../context/hooks/useInProgressAllowanceTransaction"
import { useInProgressInternalTransaction } from "../../context/hooks/useInProgressInternalTransaction"
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
} from "@block-wallet/background/controllers/BridgeController"
import { capitalize } from "../../util/capitalize"
import TransactionDetails from "../../components/transactions/TransactionDetails"
import { WithRequired } from "@block-wallet/background/utils/types/helpers"
import CollapsableWarning from "../../components/CollapsableWarning"
import { AiOutlineWarning } from "react-icons/ai"
import {
    useAddressHasEnoughNativeTokensToSend,
    EnoughNativeTokensToSend,
} from "../../context/hooks/useBridgeChainHasNotEnoughNativeTokensToSend"

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
    const [showDetails, setShowDetails] = useState<boolean>(false)
    const [advancedSettings, setAdvancedSettings] = useState<
        WithRequired<TransactionAdvancedData, "slippage">
    >(defaultAdvancedSettings)
    const [quote, setQuote] = useState<GetBridgeQuoteResponse | undefined>(
        bridgeQuote
    )

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
        BigNumber.from(
            bridgeQuote.bridgeParams.params.transactionRequest.gasLimit || 0
        )
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
              quote?.bridgeParams.params.fromAmount ||
                  bridgeQuote.bridgeParams.params.fromAmount
          ).add(fee)
        : fee

    const hasNativeAssetBalance = useHasSufficientBalance(
        total,
        nativeToken.token
    )
    const hasFromTokenBalance = useHasSufficientBalance(
        BigNumber.from(
            quote?.bridgeParams.params.fromAmount ||
                bridgeQuote.bridgeParams.params.fromAmount
        ),
        token
    )

    const hasBalance = isBridgingNativeToken
        ? hasNativeAssetBalance
        : hasNativeAssetBalance && hasFromTokenBalance

    const nativeTokensInDestinationNetworkStatus =
        useAddressHasEnoughNativeTokensToSend(
            bridgeQuote.bridgeParams.params.toChainId,
            bridgeQuote.bridgeParams.params.toToken.address
        )

    const destinationNetwork = Object.values(availableNetworks).find(
        (n) => n.chainId === bridgeQuote.bridgeParams.params.toChainId
    )
    const bridgeWarningMessage = getWarningMessages(
        nativeTokensInDestinationNetworkStatus.result,
        destinationNetwork
    )

    const showDestinationFeeWarning =
        !nativeTokensInDestinationNetworkStatus.isLoading &&
        !inProgressAllowanceTransaction?.id &&
        !inProgressTransaction?.id &&
        nativeTokensInDestinationNetworkStatus.result !==
            EnoughNativeTokensToSend.ENOUGH

    const onSubmit = async () => {
        if (error || !hasBalance || !quote) return

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
            const params: BridgeQuoteRequest = {
                toChainId: bridgeQuote.bridgeParams.params.toChainId,
                fromTokenAddress:
                    bridgeQuote.bridgeParams.params.fromToken.address,
                toTokenAddress: bridgeQuote.bridgeParams.params.toToken.address,
                fromAmount: bridgeQuote.bridgeParams.params.fromAmount,
                fromAddress: selectedAccount.address,
                slippage: advancedSettings.slippage,
            }

            setIsFetchingParams(true)
            let errorMessage: string | "" = ""
            let fetchedQuote: GetBridgeQuoteResponse | undefined
            try {
                fetchedQuote = await getBridgeQuote(params)
            } catch (error) {
                errorMessage = capitalize(
                    error.message || "Error fetching quote"
                )
            } finally {
                //in case the effect was unmounted after invoking the background
                if (isValidFetch) {
                    setTimeoutStart(
                        fetchedQuote ? new Date().getTime() : undefined
                    )
                    setQuote(fetchedQuote)
                    setIsFetchingParams(false)
                    setError(errorMessage)
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
        bridgeQuote.bridgeParams.params.fromAmount,
        bridgeQuote.bridgeParams.params.fromToken.address,
        bridgeQuote.bridgeParams.params.toChainId,
        bridgeQuote.bridgeParams.params.toToken.address,
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
                        label={
                            error
                                ? error
                                : hasBalance
                                ? "Bridge"
                                : isBridgingNativeToken
                                ? "You don't have enough funds to cover the bridge and the gas costs."
                                : "Insufficient funds"
                        }
                        isLoading={
                            error || !!inProgressAllowanceTransaction
                                ? false
                                : !quote ||
                                  isGasLoading ||
                                  isFetchingParams ||
                                  isBridging ||
                                  nativeTokensInDestinationNetworkStatus.isLoading
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
                            You will not be able to initiate the bridge until
                            the allowance transaction is mined.
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
                <TransactionDetails
                    transaction={populateBridgeTransaction(quote)}
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
            {!!showDestinationFeeWarning && !!bridgeWarningMessage && (
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
                    amount={BigNumber.from(
                        bridgeQuote.bridgeParams.params.fromAmount
                    )}
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
                        asset={bridgeQuote.bridgeParams.params.toToken}
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
                            quote && setShowDetails(true)
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
                {remainingSuffix && !isFetchingParams && (
                    <RefreshLabel value={remainingSuffix} className="pt-1" />
                )}
            </div>
        </PopupLayout>
    )
}

export default BridgeConfirmPage
