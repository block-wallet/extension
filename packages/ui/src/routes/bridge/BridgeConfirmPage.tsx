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
import { Network } from "@block-wallet/background/utils/constants/networks"
import {
    HardwareWalletOpTypes,
    TransactionCategories,
} from "../../context/commTypes"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { classnames, Classes } from "../../styles"
import { getDeviceFromAccountType } from "../../util/hardwareDevice"
import { getLatestGasPrice, rejectTransaction } from "../../context/commActions"
import { isBridgeNativeTokenAddress } from "../../util/bridgeUtils"
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

export interface BridgeConfirmPageLocalState {
    token: Token
    network: IChain
    bridgeRoute: IBridgeRoute
    amount?: string
}

const BridgeConfirmPage: FunctionComponent<{}> = () => {
    const history = useOnMountHistory()
    const { token, network, bridgeRoute } = useMemo(
        () => history.location.state as BridgeConfirmPageLocalState,
        [history.location.state]
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
            categories: [TransactionCategories.EXCHANGE],
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

    const [isGasLoading, setIsGasLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | undefined>(undefined)
    const [showDetails, setShowDetails] = useState<boolean>(false)

    const networkLabel = availableNetworks[selectedNetwork.toUpperCase()]

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

    const isBridging = status === "loading" && isOpen
    const isGasInitialized = useRef<boolean>(false)

    // Balance check
    const feePerGas = isEIP1559Compatible
        ? selectedFees.maxFeePerGas
        : selectedGasPrice

    const fee = selectedGasLimit.mul(feePerGas)
    const isBridgingNativeToken = isBridgeNativeTokenAddress(token.address)
    const total = isBridgingNativeToken
        ? BigNumber.from(token.address).add(fee)
        : fee

    const hasNativeAssetBalance = useHasSufficientBalance(
        total,
        nativeToken.token
    )
    const hasFromTokenBalance = useHasSufficientBalance(
        BigNumber.from(0),
        token
    )

    const hasBalance = isBridgingNativeToken
        ? hasNativeAssetBalance
        : hasNativeAssetBalance && hasFromTokenBalance

    const onSubmit = async () => {
        if (error || !hasBalance) return

        dispatch({ type: "open", payload: { status: "loading" } })
        const isLinked = await checkDeviceIsLinked()
        if (isLinked) {
            if (!isHardwareWallet(selectedAccount.accountType)) {
                clearLocationRecovery()
            }

            setPersistedData({
                submitted: true,
            })

            // TODO: Execute bridge
        } else {
            closeDialog()
        }
    }

    // Initialize gas
    useEffect(() => {
        const setGas = async () => {
            if (isGasInitialized.current === false) {
                setIsGasLoading(true)

                try {
                    let gasPrice: BigNumber = BigNumber.from(0)

                    if (!isEIP1559Compatible) {
                        gasPrice = await getLatestGasPrice()
                    }

                    setDefaultGas({
                        gasPrice: BigNumber.from(gasPrice),
                        gasLimit: BigNumber.from(50000), // TODO: Set actual Gas Limit
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
    }, [bridgeRoute, error])

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Bridge"
                    close="/"
                    onBack={() => {
                        //avoid returning to the approve page.
                        history.push({
                            pathname: "/bridge",
                            state: history.location.state,
                        })
                    }}
                    disabled={isBridging}
                >
                    <NetworkDisplayBadge
                        network={networkLabel}
                        className="ml-[3.9rem]"
                        truncate
                    />
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
                                : !bridgeRoute || isGasLoading || isBridging
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
            {/* <TransactionDetails
                transaction={populateExchangeTransaction(swapParameters)}
                open={showDetails}
                onClose={() => setShowDetails(false)}
                nonce={selectedSwapSettings.customNonce}
            /> */}
            <HardwareDeviceNotLinkedDialog
                onDone={resetDeviceLinkStatus}
                isOpen={isDeviceUnlinked}
                vendor={getDeviceFromAccountType(selectedAccount.accountType)}
                address={selectedAccount.address}
            />
            <div className="flex flex-col px-6 py-3">
                {/* From Token */}
                <AssetAmountDisplay asset={token} amount={BigNumber.from(0)} />

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
                <NetworkDisplay network={network} />

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
            </div>
        </PopupLayout>
    )
}

export default BridgeConfirmPage
