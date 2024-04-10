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
    useLayoutEffect,
} from "react"
import {
    approveBridgeAllowance,
    approveExchange,
    getApproveTransactionGasLimit,
    getExchangeSpender,
    getLatestGasPrice,
} from "../../context/commActions"
import WaitingDialog from "../../components/dialog/WaitingDialog"
import { useTokensList } from "../../context/hooks/useTokensList"
import { APPROVE_GAS_COST } from "../../util/constants"
import { AdvancedSettings } from "../../components/transactions/AdvancedSettings"
import { BigNumber } from "@ethersproject/bignumber"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { GasPriceSelector } from "../../components/transactions/GasPriceSelector"
import {
    formatHash,
    formatHashFirstLastChars,
    formatName,
} from "../../util/formatAccount"
import { formatRounded, formatRoundedUp } from "../../util/formatRounded"
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
import { TransactionAdvancedData } from "@block-wallet/background/controllers/transactions/utils/types"
import { BridgeConfirmPageLocalState } from "../bridge/BridgeConfirmPage"
import { useBlankState } from "../../context/background/backgroundHooks"
import { MaxUint256 } from "@ethersproject/constants"
import AllowanceInput from "../../components/transactions/AllowanceInput"
import useAccountAllowances from "../../context/hooks/useAccountAllowances"
import { AllowancesFilters } from "../../components/allowances/AllowancesFilterButton"
import { useSelectedAccountBalance } from "../../context/hooks/useSelectedAccountBalance"

import unknownTokenIcon from "../../assets/images/unknown_token.svg"
import { generateExplorerLink } from "../../util/getExplorer"
import { DEFAULT_EXCHANGE_TYPE } from "../../util/exchangeUtils"

const UNLIMITED_ALLOWANCE = MaxUint256

export enum ApproveOperation {
    BRIDGE,
    SWAP,
}

interface ApprovePageState {
    assetAllowance: BigNumber
    submitted: boolean
    txId: string
}

const INITIAL_VALUE_PERSISTED_DATA = {
    assetAllowance: UNLIMITED_ALLOWANCE,
    submitted: false,
    txId: "",
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
    const selectedAccount = useSelectedAccount()

    // Get data from window.localStorage
    const [persistedData, setPersistedData] =
        useLocalStorageState<ApprovePageState>("approve.form", {
            initialValue: INITIAL_VALUE_PERSISTED_DATA,
            volatile: true,
        })

    // Hooks
    const { transaction: inProgressTransaction, clearTransaction } =
        useInProgressInternalTransaction({ txId: persistedData.txId })

    useEffect(() => {
        if (
            inProgressTransaction?.id &&
            persistedData.submitted &&
            persistedData.txId !== inProgressTransaction?.id
        ) {
            if (isHardwareWallet(selectedAccount.accountType)) {
                setPersistedData((prev: ApprovePageState) => ({
                    ...prev,
                    txId: inProgressTransaction?.id,
                }))
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inProgressTransaction?.id])

    useLayoutEffect(() => {
        // Tx was either rejected or submitted when the pop-up was closed.
        // If we opened back the pop-up, and there aren't any pending transactions,
        // we should redirect to the home page (this is only checked on component mount)
        if (
            !inProgressTransaction?.id &&
            persistedData.submitted &&
            !persistedData.txId
        ) {
            setPersistedData(() => ({
                ...INITIAL_VALUE_PERSISTED_DATA,
                submitted: false,
            }))
            history.push("/")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const selectedAccountBalance = useSelectedAccountBalance()

    const { chainId, isEIP1559Compatible } = useSelectedNetwork()
    const { defaultGasOption, selectedNetwork, availableNetworks } =
        useBlankState()!
    const { nativeToken } = useTokensList()
    const { gasPricesLevels } = useGasPriceData()
    const { status, isOpen, dispatch, texts, titles, closeDialog, gifs } =
        useTransactionWaitingDialog(
            inProgressTransaction
                ? {
                      status: inProgressTransaction?.status,
                      error: inProgressTransaction?.error as Error,
                      epochTime: inProgressTransaction?.approveTime,
                      qrParams: inProgressTransaction?.qrParams,
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

    const [isGasUpdating, setIsGasUpdating] = useState<boolean>(false)
    const [hasBalance, setHasBalance] = useState<boolean>(false)
    const [customNonce, setCustomNonce] = useState<number | undefined>()

    // Set data
    const isApproving = status === "loading" && isOpen

    // Get asset object
    const localAsset = selectedAccount.balances[chainId].tokens[assetAddress]
    const assetBalance = localAsset.balance
    const assetName = localAsset.token.symbol
    const assetDecimals = localAsset.token.decimals
    const assetLogo = localAsset.token.logo

    const [isAllowanceValid, setIsAllowanceValid] = useState(true)
    const [allowanceAmount, setAllowanceAmount] = useState(
        minAllowance
            ? formatRoundedUp(formatUnits(minAllowance, assetDecimals))
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

    const currentAllowances = useAccountAllowances(AllowancesFilters.SPENDER)

    const [currentAllowanceValue, setCurrentAllowanceValue] =
        useState<BigNumber>(BigNumber.from(0))
    const [isCurrentAllowanceUnlimited, setIsCurrentAllowanceUnlimited] =
        useState<boolean | undefined>()

    const [spenderName, setSpenderName] = useState<string>()

    const [spenderAddressExplorerLink, setSpenderAddressExplorerLink] =
        useState<string>()

    useEffect(() => {
        if (approveOperation === ApproveOperation.BRIDGE) {
            const nextState = nextLocationState as BridgeConfirmPageLocalState

            const spenderAddress =
                nextState.bridgeQuote.bridgeParams.params.spender.toLowerCase()

            const currentSpenderAllowances = currentAllowances.find(
                (allowance) =>
                    allowance.groupBy.address.toLowerCase() === spenderAddress
            )

            const currentAllowance = currentSpenderAllowances?.allowances?.find(
                (allowance) =>
                    allowance.displayData.address.toLowerCase() ===
                    nextState.bridgeQuote.bridgeParams.params.fromToken.address.toLowerCase()
            )

            setCurrentAllowanceValue(
                currentAllowance?.allowance?.value ?? BigNumber.from(0)
            )
            setIsCurrentAllowanceUnlimited(
                currentAllowance?.allowance?.isUnlimited
            )

            setSpenderName(
                currentSpenderAllowances?.groupBy.name ??
                    `Spender ${formatHashFirstLastChars(spenderAddress)}`
            )

            setSpenderAddressExplorerLink(
                generateExplorerLink(
                    availableNetworks,
                    selectedNetwork,
                    spenderAddress,
                    "address"
                )
            )
        } else {
            const nextState = nextLocationState as SwapConfirmPageLocalState
            getExchangeSpender(DEFAULT_EXCHANGE_TYPE).then((spenderAddress) => {
                const currentSpenderAllowances = currentAllowances.find(
                    (allowance) =>
                        allowance.groupBy.address.toLowerCase() ===
                        spenderAddress.toLowerCase()
                )

                const currentAllowance =
                    currentSpenderAllowances?.allowances?.find(
                        (allowance) =>
                            allowance.displayData.address.toLowerCase() ===
                            nextState.swapQuote.fromToken.address.toLowerCase()
                    )

                setCurrentAllowanceValue(
                    currentAllowance?.allowance?.value ?? BigNumber.from(0)
                )
                setIsCurrentAllowanceUnlimited(
                    currentAllowance?.allowance?.isUnlimited
                )
                setSpenderName(
                    currentSpenderAllowances?.groupBy.name ??
                        `Spender ${formatHashFirstLastChars(spenderAddress)}`
                )
                setSpenderAddressExplorerLink(
                    generateExplorerLink(
                        availableNetworks,
                        selectedNetwork,
                        spenderAddress,
                        "address"
                    )
                )
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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
                    DEFAULT_EXCHANGE_TYPE,
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
                txId: "",
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

    const mainSectionText = (
        <>
            {isRevoke ? (
                <>
                    <a
                        href={spenderAddressExplorerLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-blue-default hover:underline"
                    >
                        {spenderName}
                    </a>{" "}
                    will not be able to access your {assetName} anymore.
                </>
            ) : (
                <>
                    This will let{" "}
                    <a
                        href={spenderAddressExplorerLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-blue-default hover:underline"
                    >
                        {spenderName}
                    </a>{" "}
                    withdraw and automate {assetName} transactions for you.
                </>
            )}
        </>
    )

    const mainSection = (
        <>
            <div className="flex flex-col space-y-3 px-6 py-4">
                <p className="text-sm font-semibold">{`You are about to update your ${assetName} allowance`}</p>
                <p className="text-sm text-primary-grey-dark">
                    {mainSectionText}
                </p>
                {currentAllowanceValue && (
                    <p
                        className="flex items-center space-x-1 text-sm text-primary-grey-dark break-word mt-2"
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
            <div className="flex flex-col space-y-3 px-6">
                <AllowanceInput
                    tokenDecimals={assetDecimals}
                    tokenName={assetName}
                    defaultValue={BigNumber.from(minAllowance)._hex}
                    onChange={setAllowanceAmount}
                    setIsValid={setIsAllowanceValid}
                    minimumAllowance={minAllowance}
                    currentAllowance={currentAllowanceValue}
                />

                <label className="text-[13px] font-medium text-primary-grey-dark">
                    Gas Price
                </label>
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
                <ErrorMessage className="!mt-0">
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
            showProviderStatus
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
                timeout={1500}
                onDone={onDone}
                clickOutsideToClose={false}
                gifs={gifs}
                showCloseButton
            />
            <div className="px-6 py-2 flex flex-row items-center">
                <AccountIcon
                    className="w-10 h-10"
                    fill={getAccountColor(selectedAccount.address)}
                />
                <div className="relative flex flex-col group space-y-1 ml-4">
                    <span className="text-sm font-semibold">
                        {formatName(selectedAccount.name, 15)}
                    </span>
                    <span
                        className="text-xs text-primary-grey-dark truncate"
                        title={selectedAccount.address}
                    >
                        {formatHash(selectedAccount.address)}
                    </span>
                </div>
                <div className="ml-auto flex flex-col items-end space-x-1">
                    <div
                        className="flex flex-row items-center"
                        title={`${formatRounded(
                            formatUnits(assetBalance || "0", assetDecimals)
                        )} ${assetName}`}
                    >
                        <span className="text-xs text-primary-grey-dark truncate">
                            {`${formatRounded(
                                formatUnits(assetBalance || "0", assetDecimals)
                            )}`}
                        </span>
                        <img
                            src={assetLogo || unknownTokenIcon}
                            onError={(e) => {
                                ;(e.target as any).onerror = null
                                ;(e.target as any).src = unknownTokenIcon
                            }}
                            alt={assetName}
                            width="14px"
                            draggable={false}
                            className="ml-1"
                        />
                    </div>
                    <div
                        className="flex flex-row items-center mt-1"
                        title={`${formatName(
                            formatRounded(
                                formatUnits(
                                    selectedAccountBalance || "0",
                                    nativeToken.token.decimals
                                )
                            ),
                            18
                        )} ${nativeToken.token.symbol}`}
                    >
                        <span className="text-xs text-primary-grey-dark truncate">
                            {formatName(
                                formatRounded(
                                    formatUnits(
                                        selectedAccountBalance || "0",
                                        nativeToken.token.decimals
                                    )
                                ),
                                18
                            )}
                        </span>
                        <img
                            src={nativeToken.token.logo || unknownTokenIcon}
                            onError={(e) => {
                                ;(e.target as any).onerror = null
                                ;(e.target as any).src = unknownTokenIcon
                            }}
                            alt={nativeToken.token.symbol}
                            width="14px"
                            draggable={false}
                            className="ml-1"
                        />
                    </div>
                </div>
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
