import AccountIcon from "../../components/icons/AccountIcon"
import Divider from "../../components/Divider"
import ErrorMessage from "../../components/error/ErrorMessage"
import GasPriceComponent from "../../components/transactions/GasPriceComponent"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import {
    useEffect,
    useState,
    FunctionComponent,
    useMemo,
    useCallback,
} from "react"
import {
    approveBridgeAllowance,
    approveExchange,
    getApproveTransactionGasLimit,
    getLatestGasPrice,
} from "../../context/commActions"
import WaitingDialog from "../../components/dialog/WaitingDialog"
import { useTokensList } from "../../context/hooks/useTokensList"
import { APPROVE_GAS_COST } from "../../util/constants"
import { AdvancedSettings } from "../../components/transactions/AdvancedSettings"
import { BigNumber } from "@ethersproject/bignumber"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { GasPriceSelector } from "../../components/transactions/GasPriceSelector"
import { formatName } from "../../util/formatAccount"
import { formatRounded } from "../../util/formatRounded"
import { formatUnits, parseUnits } from "@ethersproject/units"
import { getAccountColor } from "../../util/getAccountColor"
import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import useCheckAccountDeviceLinked from "../../util/hooks/useCheckAccountDeviceLinked"
import { getDeviceFromAccountType } from "../../util/hardwareDevice"
import { useLocationRecovery } from "../../util/hooks/useLocationRecovery"
import useLocalStorageState from "../../util/hooks/useLocalStorageState"
import { useInProgressInternalTransaction } from "../../context/hooks/useInProgressInternalTransaction"
import { isHardwareWallet } from "../../util/account"
import { useTransactionWaitingDialog } from "../../context/hooks/useTransactionWaitingDialog"
import { HardwareWalletOpTypes } from "../../context/commTypes"
import { rejectTransaction } from "../../context/commActions"
import { SwapConfirmPageLocalState } from "../swap/SwapConfirmPage"
import { ExchangeType } from "../../context/commTypes"
import { TransactionAdvancedData } from "@block-wallet/background/controllers/transactions/utils/types"
import { BridgeConfirmPageLocalState } from "../bridge/BridgeConfirmPage"
import { useBlankState } from "../../context/background/backgroundHooks"
import { MaxUint256 } from "@ethersproject/constants"
import AllowanceInput from "../../components/transactions/AllowanceInput"
import useAccountAllowances from "../../context/hooks/useAccountAllowances"
import { AllowancesFilters } from "../../components/allowances/AllowancesFilterButton"

const UNLIMITED_ALLOWANCE = MaxUint256

export enum ApproveOperation {
    BRIDGE,
    SWAP,
}

const getLabels = (
    operation: ApproveOperation,
    assetName: string
): Record<
    "mainSectionTitle" | "mainSectionApproveText" | "mainSectionRevokeText",
    string
> => {
    if (operation === ApproveOperation.BRIDGE) {
        return {
            mainSectionTitle: `Set ${assetName} Allowance`,
            mainSectionApproveText: `This will let BlockWallet Bridges withdraw and automate ${assetName} transactions for you.`,
            mainSectionRevokeText: `BlockWallet Bridges will not be able to access your ${assetName} anymore.`,
        }
    } else {
        return {
            mainSectionTitle: `Set ${assetName} Allowance`,
            mainSectionApproveText: `This will let BlockWallet Swaps withdraw and automate ${assetName} transactions for you.`,
            mainSectionRevokeText: `BlockWallet Swaps will not be able to access your ${assetName} anymore.`,
        }
    }
}

interface ApprovePageState {
    assetAllowance: BigNumber
    submitted: boolean
}

const INITIAL_VALUE_PERSISTED_DATA = {
    assetAllowance: UNLIMITED_ALLOWANCE,
    submitted: false,
}

export interface ApprovePageLocalState {
    assetAddress: string
    minAllowance?: BigNumber
    approveOperation: ApproveOperation
    nextLocationState: BridgeConfirmPageLocalState | SwapConfirmPageLocalState
}

const ApprovePage: FunctionComponent<{}> = () => {
    // History
    const { clear: clearLocationRecovery } = useLocationRecovery()
    const history: any = useOnMountHistory()
    const {
        assetAddress,
        minAllowance,
        approveOperation = ApproveOperation.SWAP,
        nextLocationState,
    } = useMemo(
        () => history.location.state as ApprovePageLocalState,
        [history.location.state]
    )

    // Get data from window.localStorage
    const [persistedData, setPersistedData] =
        useLocalStorageState<ApprovePageState>("approve.form", {
            initialValue: INITIAL_VALUE_PERSISTED_DATA,
            volatile: true,
        })

    // Hooks
    const { transaction: inProgressTransaction, clearTransaction } =
        useInProgressInternalTransaction()
    useEffect(() => {
        // Tx was either rejected or submitted when the pop-up was closed.
        // If we opened back the pop-up, and there aren't any pending transactions,
        // we should redirect to the home page (this is only checked on component mount)
        if (!inProgressTransaction?.id && persistedData.submitted) {
            history.push("/")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const selectedAccount = useSelectedAccount()
    const { chainId, isEIP1559Compatible } = useSelectedNetwork()
    const { defaultGasOption } = useBlankState()!
    const { nativeToken } = useTokensList()
    const { gasPricesLevels } = useGasPriceData()
    const { status, isOpen, dispatch, texts, titles, closeDialog, gifs } =
        useTransactionWaitingDialog(
            inProgressTransaction
                ? {
                      status: inProgressTransaction?.status,
                      error: inProgressTransaction?.error as Error,
                      epochTime: inProgressTransaction?.approveTime,
                  }
                : undefined,
            HardwareWalletOpTypes.APPROVE_ALLOWANCE,
            selectedAccount.accountType,
            {
                reject: useCallback(() => {
                    if (inProgressTransaction?.id) {
                        rejectTransaction(inProgressTransaction?.id)
                    }
                }, [inProgressTransaction?.id]),
            }
        )

    const { assetAllowance } = persistedData || INITIAL_VALUE_PERSISTED_DATA

    const [isGasUpdating, setIsGasUpdating] = useState<boolean>(false)
    const [hasBalance, setHasBalance] = useState<boolean>(false)
    const [customNonce, setCustomNonce] = useState<number | undefined>()

    // Set data
    const isApproving = status === "loading" && isOpen
    const labels = getLabels(
        approveOperation,
        selectedAccount.balances[chainId].tokens[assetAddress].token.symbol
    )

    // Get asset object
    const localAsset = selectedAccount.balances[chainId].tokens[assetAddress]
    const assetBalance = localAsset.balance
    const assetName = localAsset.token.symbol
    const assetDecimals = localAsset.token.decimals

    const [isAllowanceValid, setIsAllowanceValid] = useState(true)
    const [allowanceAmount, setAllowanceAmount] = useState(
        minAllowance
            ? formatUnits(minAllowance, assetDecimals)
            : formatUnits(UNLIMITED_ALLOWANCE, assetDecimals)
    )

    const { isDeviceUnlinked, checkDeviceIsLinked, resetDeviceLinkStatus } =
        useCheckAccountDeviceLinked()

    // Gas
    const [defaultGas, setDefaultGas] = useState<{
        gasPrice: BigNumber
        gasLimit: BigNumber
    }>({
        gasPrice: BigNumber.from(gasPricesLevels.average.gasPrice ?? "0"),
        gasLimit: BigNumber.from(APPROVE_GAS_COST),
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
        BigNumber.from(APPROVE_GAS_COST)
    )

    let currentAllowanceValue: BigNumber | undefined
    let isCurrentAllowanceUnlimited: boolean | undefined
    if (approveOperation === ApproveOperation.BRIDGE) {
        const nextState = nextLocationState as BridgeConfirmPageLocalState

        const currentSpenderAllowances = useAccountAllowances(
            AllowancesFilters.SPENDER,
            nextState.bridgeQuote.bridgeParams.params.spender
        )[0]

        const currentAllowance = currentSpenderAllowances?.allowances?.find(
            (allowance) =>
                allowance.displayData.address.toLowerCase() ===
                nextState.bridgeQuote.bridgeParams.params.fromToken.address.toLowerCase()
        )

        currentAllowanceValue = currentAllowance?.allowance?.value

        isCurrentAllowanceUnlimited = currentAllowance?.allowance?.isUnlimited
    }

    // Fees
    useEffect(() => {
        const fetch = async () => {
            try {
                setIsGasUpdating(true)
                setDefaultGas({
                    gasLimit: BigNumber.from(
                        (
                            await getApproveTransactionGasLimit(
                                localAsset.token.address,
                                selectedAccount.address
                            )
                        ).gasLimit
                    ),
                    gasPrice: BigNumber.from(
                        !isEIP1559Compatible ? await getLatestGasPrice() : 0
                    ),
                })
            } finally {
                setIsGasUpdating(false)
            }
        }
        fetch()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEIP1559Compatible])

    // Balance check
    const feePerGas = !isEIP1559Compatible
        ? selectedGasPrice
        : selectedFees.maxFeePerGas

    useEffect(() => {
        setHasBalance(
            selectedGasLimit.mul(feePerGas).lt(nativeToken.balance || 0)
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedGasLimit, feePerGas, nativeToken.balance])

    // Submit
    const onSubmit = async () => {
        dispatch({ type: "open", payload: { status: "loading" } })

        const isLinked = await checkDeviceIsLinked()
        if (!isLinked) {
            closeDialog()
            return
        }

        setPersistedData((prev: ApprovePageState) => ({
            ...prev,
            submitted: true,
        }))

        // clear history so that the user comes back to the home page if he clicks away
        // Hw accounts needs user interaction before submitting the TX, so that we may want the
        // user come back to this screen after reopening.
        if (!isHardwareWallet(selectedAccount.accountType)) {
            clearLocationRecovery()
            //clean the window.localStorage
            setPersistedData(INITIAL_VALUE_PERSISTED_DATA)
        }

        try {
            let allowanceResponse: boolean

            if (approveOperation === ApproveOperation.SWAP) {
                const nextState = nextLocationState as SwapConfirmPageLocalState
                allowanceResponse = await approveExchange(
                    parseUnits(allowanceAmount, assetDecimals),
                    BigNumber.from(nextState.swapQuote.fromTokenAmount),
                    ExchangeType.SWAP_1INCH,
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
                    nextState.swapQuote.fromToken.address,
                    customNonce
                )
            } else {
                const nextState =
                    nextLocationState as BridgeConfirmPageLocalState

                allowanceResponse = await approveBridgeAllowance(
                    parseUnits(allowanceAmount, assetDecimals),
                    BigNumber.from(
                        nextState.bridgeQuote.bridgeParams.params.fromAmount
                    ),
                    nextState.bridgeQuote.bridgeParams.params.spender,
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
                    nextState.bridgeQuote.bridgeParams.params.fromToken.address,
                    customNonce
                )
            }

            if (allowanceResponse) {
                dispatch({
                    type: "setStatus",
                    payload: { status: "success" },
                })
            } else {
                throw new Error("Error submitting the allowance request")
            }
        } catch (e) {
            dispatch({
                type: "setStatus",
                payload: { status: "error", texts: { error: e.message } },
            })
        }
    }

    const onDone = () => {
        if (status === "error") {
            closeDialog()
            setPersistedData((prev: ApprovePageState) => ({
                ...prev,
                submitted: false,
            }))
            clearTransaction()
            return
        }

        const pathname =
            approveOperation === ApproveOperation.SWAP
                ? "/swap/confirm"
                : approveOperation === ApproveOperation.BRIDGE
                ? "/bridge/confirm"
                : "/"

        history.push({
            pathname,
            state: {
                ...nextLocationState,
                allowanceTransactionId: inProgressTransaction?.id,
            },
        })
    }

    const onBack = () => {
        if (approveOperation === ApproveOperation.SWAP) {
            return () => {
                history.push({
                    pathname: "/swap",
                    state: {
                        ...nextLocationState,
                        transitionDirection: "right",
                    },
                })
            }
        } else if (approveOperation === ApproveOperation.BRIDGE) {
            return () => {
                history.push({
                    pathname: "/bridge",
                    state: {
                        ...nextLocationState,
                        transitionDirection: "right",
                    },
                })
            }
        }
    }

    const isRevoke = parseFloat(allowanceAmount) === 0

    const mainSection = (
        <>
            <div className="flex flex-col space-y-3 px-6 py-4">
                <p className="text-sm font-bold">{labels.mainSectionTitle}</p>
                <p className="text-sm text-gray-500">
                    {isRevoke
                        ? labels.mainSectionRevokeText
                        : labels.mainSectionApproveText}
                </p>
                {currentAllowanceValue && (
                    <p
                        className="flex items-center space-x-1 text-sm text-gray-500 break-word mt-2"
                        title={`${Number(
                            formatUnits(currentAllowanceValue, assetDecimals)
                        )} ${assetName}`}
                    >
                        <span>Current allowance:</span>
                        {isCurrentAllowanceUnlimited ? (
                            <span className="text-xl"> &#8734;</span>
                        ) : (
                            <span>
                                {formatUnits(
                                    currentAllowanceValue,
                                    assetDecimals
                                )}
                            </span>
                        )}
                        <span>{assetName}</span>
                    </p>
                )}
            </div>
            <div className="flex flex-col space-y-3 px-6 pt-4">
                <AllowanceInput
                    tokenDecimals={assetDecimals}
                    tokenName={assetName}
                    defaultValue={BigNumber.from(minAllowance)._hex}
                    onChange={setAllowanceAmount}
                    setIsValid={setIsAllowanceValid}
                    minimumAllowance={minAllowance}
                />

                <label className="text-sm text-gray-600">Gas Price</label>
                {!isEIP1559Compatible ? (
                    <GasPriceSelector
                        defaultLevel={defaultGasOption || "medium"}
                        defaultGasLimit={defaultGas.gasLimit}
                        defaultGasPrice={defaultGas.gasPrice}
                        setGasPriceAndLimit={(gasPrice, gasLimit) => {
                            setSelectedGasPrice(gasPrice)
                            setSelectedGasLimit(gasLimit)
                        }}
                        isParentLoading={isGasUpdating}
                        disabled={isGasUpdating}
                    />
                ) : (
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
                        isParentLoading={isGasUpdating}
                        disabled={isGasUpdating}
                        displayOnlyMaxValue
                    />
                )}
                <AdvancedSettings
                    address={selectedAccount.address}
                    advancedSettings={{ customNonce }}
                    display={{
                        nonce: true,
                        flashbots: false,
                        slippage: false,
                    }}
                    setAdvancedSettings={(
                        newSettings: TransactionAdvancedData
                    ) => {
                        setCustomNonce(newSettings.customNonce)
                    }}
                    buttonDisplay={false}
                />
                <ErrorMessage>
                    {hasBalance ? undefined : "Insufficient funds"}
                </ErrorMessage>
            </div>
        </>
    )

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title={"Allowance"}
                    disabled={isApproving}
                    onBack={onBack()}
                    networkIndicator
                    keepState
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label={isRevoke ? "Revoke" : "Approve"}
                        isLoading={isApproving}
                        disabled={
                            !hasBalance || isGasUpdating || !isAllowanceValid
                        }
                        onClick={onSubmit}
                    />
                </PopupFooter>
            }
        >
            <WaitingDialog
                open={isOpen}
                status={status}
                titles={{
                    loading: titles?.loading || "Approving...",
                    success: titles?.success || "Success",
                    error: titles?.error || "Error",
                }}
                texts={{
                    loading: texts?.loading || "Initiating the approval...",
                    success:
                        texts?.success ||
                        "You've submitted the approval request.",
                    error:
                        texts?.error ||
                        "There was an error while approving the asset.",
                }}
                txHash={inProgressTransaction?.transactionParams.hash}
                timeout={2900}
                onDone={onDone}
                clickOutsideToClose={false}
                gifs={gifs}
            />
            <div className="px-6 py-2 flex flex-row items-center">
                <AccountIcon
                    className="w-10 h-10"
                    fill={getAccountColor(selectedAccount.address)}
                />
                <div className="relative flex flex-col group space-y-1 ml-4">
                    <span className="text-sm font-bold">
                        {formatName(selectedAccount.name, 15)}
                    </span>
                    <span className="text-xs text-gray-600">
                        {formatRounded(
                            formatUnits(
                                nativeToken.balance || "0",
                                nativeToken.token.decimals
                            )
                        )}
                        {` ${nativeToken.token.symbol}`}
                    </span>
                </div>
                <p className="ml-auto text-sm text-gray-600">
                    {formatRounded(
                        formatUnits(assetBalance || "0", assetDecimals)
                    )}
                    {` ${assetName}`}
                </p>
            </div>
            <Divider />
            {mainSection}
            <HardwareDeviceNotLinkedDialog
                isOpen={isDeviceUnlinked}
                onDone={resetDeviceLinkStatus}
                vendor={getDeviceFromAccountType(selectedAccount.accountType)}
                address={selectedAccount.address}
            />
        </PopupLayout>
    )
}

export default ApprovePage
