import {
    useState,
    useEffect,
    FunctionComponent,
    useCallback,
    useLayoutEffect,
} from "react"
import { Redirect } from "react-router-dom"
import { formatUnits } from "@ethersproject/units"
import { getAddress } from "@ethersproject/address"
import { BigNumber } from "@ethersproject/bignumber"
import { AiFillInfoCircle } from "react-icons/ai"

import {
    TransactionAdvancedData,
    TransactionMeta,
} from "@block-wallet/background/controllers/transactions/utils/types"
import useNextRequestRoute from "../../context/hooks/useNextRequestRoute"
import {
    confirmTransaction,
    getTokenBalance,
    rejectTransaction,
    searchTokenInAssetsList,
    setUserSettings,
    updateTransactionStatus,
} from "../../context/commActions"
import {
    HardwareWalletOpTypes,
    TransactionCategories,
    TransactionStatus,
} from "../../context/commTypes"
import { TransactionFeeData } from "@block-wallet/background/controllers/erc-20/transactions/SignedTransaction"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useSelectedAccountBalance } from "../../context/hooks/useSelectedAccountBalance"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useTokensList } from "../../context/hooks/useTokensList"
import { useUserSettings } from "../../context/hooks/useUserSettings"
import { useNonSubmittedCombinedTransaction } from "../../context/hooks/useNonSubmittedExternalTransaction"
import { useTransactionById } from "../../context/hooks/useTransactionById"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import useAccountAllowances from "../../context/hooks/useAccountAllowances"
import { useTransactionWaitingDialog } from "../../context/hooks/useTransactionWaitingDialog"

import AccountIcon from "../../components/icons/AccountIcon"
import CheckBoxDialog from "../../components/dialog/CheckboxDialog"
import Divider from "../../components/Divider"
import GasPriceComponent from "../../components/transactions/GasPriceComponent"
import LoadingOverlay from "../../components/loading/LoadingOverlay"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import Tooltip from "../../components/label/Tooltip"
import { AllowancesFilters } from "../../components/allowances/AllowancesFilterButton"
import WaitingDialog from "../../components/dialog/WaitingDialog"
import { AdvancedSettings } from "../../components/transactions/AdvancedSettings"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { Classes } from "../../styles/classes"
import { GasPriceSelector } from "../../components/transactions/GasPriceSelector"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import AllowanceInput from "../../components/transactions/AllowanceInput"

import {
    formatHash,
    formatHashFirstLastChars,
    formatName,
} from "../../util/formatAccount"
import { formatRounded, formatRoundedUp } from "../../util/formatRounded"
import { getAccountColor } from "../../util/getAccountColor"
import { parseAllowance } from "../../util/approval"
import useDebouncedState from "../../util/hooks/useDebouncedState"
import { getDeviceFromAccountType } from "../../util/hardwareDevice"
import { DAPP_FEEDBACK_WINDOW_TIMEOUT } from "../../util/constants"
import useCheckAccountDeviceLinked from "../../util/hooks/useCheckAccountDeviceLinked"
import { canUserSubmitTransaction } from "../../util/transactionUtils"
import { generateExplorerLink } from "../../util/getExplorer"

import unknownTokenIcon from "../../assets/images/unknown_token.svg"
import useLocalStorageState from "../../util/hooks/useLocalStorageState"
import { useInProgressInternalTransaction } from "../../context/hooks/useInProgressInternalTransaction"

const UNKNOWN_BALANCE = "UNKNOWN_BALANCE"

export interface ApproveAssetProps {
    transactionId: string
    transactionCount: number
}
interface ApproveAssetPageState {
    txId: string
}

const ApproveAssetPage = () => {
    const history = useOnMountHistory()
    const from = history.location?.state?.from
    const fromState = history.location?.state?.fromState
    const { transaction: nextTransaction, transactionCount } =
        useNonSubmittedCombinedTransaction()
    const route = useNextRequestRoute()

    // Get data from window.localStorage
    const [persistedData, setPersistedData] =
        useLocalStorageState<ApproveAssetPageState>("approveasset.form", {
            initialValue: { txId: "" },
            volatile: true,
        })

    const { transaction: inProgressTransaction } =
        useInProgressInternalTransaction({ txId: persistedData.txId })

    const [currentTx, setCurrentTx] = useDebouncedState<TransactionMeta>(
        inProgressTransaction || nextTransaction,
        DAPP_FEEDBACK_WINDOW_TIMEOUT
    )

    useLayoutEffect(() => {
        if (nextTransaction) {
            //only override the transactionId when there is another one to process
            //to avoid passing an empty transactionId to the child component and break the UI.
            setCurrentTx(nextTransaction)

            if (
                nextTransaction.id &&
                persistedData.txId !== nextTransaction?.id
            ) {
                setPersistedData((prev: ApproveAssetPageState) => ({
                    ...prev,
                    txId: nextTransaction.id,
                }))
            }
        } else if (inProgressTransaction) {
            setCurrentTx(inProgressTransaction)
        }
    }, [
        nextTransaction,
        setCurrentTx,
        persistedData,
        inProgressTransaction,
        setPersistedData,
    ])
    if (
        !currentTx ||
        currentTx.transactionCategory !==
            TransactionCategories.TOKEN_METHOD_APPROVE ||
        currentTx.advancedData?.tokenId ||
        [
            TransactionStatus.CONFIRMED,
            TransactionStatus.REJECTED,
            TransactionStatus.SUBMITTED,
        ].includes(currentTx.status)
    ) {
        return (
            <Redirect
                to={{ pathname: from ? from : route, state: fromState }}
            />
        )
    } else {
        return (
            <ApproveAsset
                transactionId={currentTx.id}
                transactionCount={transactionCount}
            />
        )
    }
}

const ApproveAsset: FunctionComponent<ApproveAssetProps> = ({
    transactionCount,
    transactionId,
}) => {
    // Hooks
    const {
        selectedNetwork,
        availableNetworks,
        accounts,
        selectedAddress,
        settings,
        defaultGasOption,
    } = useBlankState()!
    const { chainId, isEIP1559Compatible } = useSelectedNetwork()
    const { hideAddressWarning } = useUserSettings()
    const selectedAccountBalance = useSelectedAccountBalance()
    const { nativeToken } = useTokensList()

    const { isDeviceUnlinked, checkDeviceIsLinked, resetDeviceLinkStatus } =
        useCheckAccountDeviceLinked()

    // Get tx
    const { transaction: txById, params } = useTransactionById(transactionId)

    // At this point transactionId is ensured.
    const transaction = txById!

    const spenderAddress =
        transaction.approveAllowanceParams?.spenderAddress ??
        "0x" + transaction.transactionParams?.data?.slice(34, 74)

    const spenderName =
        transaction.approveAllowanceParams?.spenderInfo?.name ??
        `Spender ${formatHashFirstLastChars(spenderAddress)}`

    const spenderAddressExplorerLink = generateExplorerLink(
        availableNetworks,
        selectedNetwork,
        spenderAddress,
        "address"
    )

    // Detect if the transaction was triggered using an address different to the active one
    const checksumFromAddress = getAddress(params.from!)
    const differentAddress = checksumFromAddress !== selectedAddress

    // If differentAddress, fetch the balance of that address instead of the selected one.
    const balance = differentAddress
        ? accounts[checksumFromAddress].balances[chainId].nativeTokenBalance ??
          BigNumber.from("0")
        : selectedAccountBalance

    // Local state
    const [tokenName, setTokenName] = useState("")
    const [tokenLogo, setTokenLogo] = useState("")

    const [accountWarningClosed, setAccountWarningClosed] = useState(false)
    const [assetBalance, setAssetBalance] = useState("0.0")
    const [isLoading, setIsLoading] = useState(transaction.loadingGasValues)
    const [isTokenLoading, setIsTokenLoading] = useState(true)
    const [isNameLoading, setIsNameLoading] = useState(true)

    const [isManuallyRejected, setIsManuallyRejected] = useState(false)

    const [transactionAdvancedData, setTransactionAdvancedData] =
        useState<TransactionAdvancedData>({})

    const [hasBalance, setHasBalance] = useState(true)
    const [gasEstimationFailed, setGasEstimationFailed] = useState(false)

    const [defaultGas, setDefaultGas] = useState<TransactionFeeData>({
        gasLimit: params.gasLimit,
        gasPrice: params.gasPrice,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas,
        maxFeePerGas: params.maxFeePerGas,
    })

    const [transactionGas, setTransactionGas] = useState<TransactionFeeData>({
        gasLimit: params.gasLimit,
        gasPrice: params.gasPrice,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas,
        maxFeePerGas: params.maxFeePerGas,
    })

    const calcTranTotals = () => {
        const gas = BigNumber.from(
            transactionGas.gasLimit!.mul(
                transactionGas.gasPrice ?? transactionGas.maxFeePerGas!
            )
        )

        setHasBalance(gas.lt(balance))
    }

    // Set data
    const account = accounts[checksumFromAddress]
    const tokenAddress = params.to!
    const tokenDecimals = transaction.advancedData?.decimals!
    const defaultAllowance = transaction.advancedData?.allowance!

    const [allowance, setAllowance] = useState(
        formatRoundedUp(formatUnits(defaultAllowance, tokenDecimals))
    )
    useEffect(() => {
        // To reset the default value if there is multiple queued transactions
        setAllowance(
            formatRoundedUp(formatUnits(defaultAllowance, tokenDecimals))
        )
    }, [defaultAllowance, tokenDecimals])

    useEffect(() => {
        setIsManuallyRejected(false)
    }, [transactionId])

    const [isAllowanceValid, setIsAllowanceValid] = useState(true)

    const currentSpenderAllowances = useAccountAllowances(
        AllowancesFilters.SPENDER,
        spenderAddress
    )

    const currentAllowance =
        currentSpenderAllowances.length > 0 &&
        currentSpenderAllowances[0]?.allowances?.find(
            (allowance) =>
                allowance.displayData.address.toLowerCase() ===
                tokenAddress.toLowerCase()
        )

    const currentAllowanceValue = currentAllowance
        ? currentAllowance?.allowance?.value
        : BigNumber.from("0")

    const isCurrentAllowanceUnlimited =
        currentAllowance && currentAllowance?.allowance?.isUnlimited

    const { status, isOpen, dispatch, texts, titles, closeDialog, gifs } =
        useTransactionWaitingDialog(
            transaction
                ? {
                      id: transactionId,
                      status: transaction.status,
                      error: transaction.error as Error,
                      epochTime: transaction?.approveTime,
                      qrParams: transaction?.qrParams,
                  }
                : undefined,
            HardwareWalletOpTypes.APPROVE_ALLOWANCE,
            account.accountType,
            {
                reject: useCallback(() => {
                    if (transactionId) {
                        rejectTransaction(transactionId)
                    }
                }, [transactionId]),
            }
        )

    // To prevent calculations on every render, force dependency array to only check state value that impacts
    useEffect(() => {
        calcTranTotals()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactionGas, transactionId])

    // Effect to check if background finishes loading default values
    useEffect(() => {
        if (isLoading && !transaction.loadingGasValues) {
            setDefaultGas({
                gasLimit: params.gasLimit,
                gasPrice: params.gasPrice,
                maxPriorityFeePerGas: params.maxPriorityFeePerGas,
                maxFeePerGas: params.maxFeePerGas,
            })
            setGasEstimationFailed(transaction.gasEstimationFailed ?? false)
            setIsLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transaction.loadingGasValues])

    useEffect(() => {
        setIsTokenLoading(true)
        getTokenBalance(tokenAddress, account.address)
            .then((fetchedBalance) => {
                setAssetBalance(
                    formatRounded(
                        formatUnits(
                            BigNumber.from(fetchedBalance),
                            tokenDecimals
                        )
                    )
                )
            })
            .catch((error: Error) => {
                // This shouldn't happen
                if (error.message.includes("code=CALL_EXCEPTION")) {
                    setAssetBalance(UNKNOWN_BALANCE)
                }
            })
            .finally(() => {
                setIsTokenLoading(false)
            })

        searchTokenInAssetsList(tokenAddress)
            .then((searchTokensResponse) => {
                const token = searchTokensResponse.tokens[0]
                setTokenName(token.symbol)
                setTokenLogo(token.logo)
            })
            .catch(() => {
                throw new Error("Failed to fetch token data")
            })
            .finally(() => {
                setIsNameLoading(false)
            })
    }, [account.address, tokenAddress, tokenDecimals])

    const approve = async () => {
        try {
            dispatch({ type: "open", payload: { status: "loading" } })
            const isLinked = await checkDeviceIsLinked()
            if (!isLinked) {
                closeDialog()
                return
            }
            await confirmTransaction(transaction.id, transactionGas, {
                customAllowance: parseAllowance(allowance, tokenDecimals),
                customNonce: transactionAdvancedData.customNonce,
            })
        } catch (error) {
            console.log(error)
            dispatch({ type: "open", payload: { status: "error" } })
        }
    }

    const reject = async () => {
        setIsManuallyRejected(true)
        dispatch({
            type: "open",
            payload: {
                status: "loading",
                titles: { loading: "Rejecting..." },
                texts: { loading: "Rejecting allowance change request..." },
            },
        })
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 300)
        })
        await rejectTransaction(transactionId)
        dispatch({
            type: "setStatus",
            payload: {
                status: "error",
                titles: { error: "Token Allowance Rejected" },
                texts: {
                    error: "Token allowance request was rejected.",
                },
            },
        })
    }

    const origin = (
        <span className="inline-block" title={transaction.origin}>
            {formatName(transaction.origin, 60)}
        </span>
    )
    const isFromBlockWallet = transaction.origin === "blank"
    const isRevoke = parseFloat(allowance) === 0

    const mainSectionTitle = (
        <>
            {isFromBlockWallet ? "You are about" : <>{origin} is requesting</>}{" "}
            to update your {tokenName} allowance
        </>
    )

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
                    will not be able to access your {tokenName} anymore.
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
                    withdraw and automate {tokenName} transactions for you.
                </>
            )}
        </>
    )

    const mainSection = (
        <>
            <div className="px-6 py-3">
                <p className="text-sm font-semibold pb-2 break-word">
                    {mainSectionTitle}
                </p>
                <p className="text-sm text-primary-grey-dark break-word">
                    {mainSectionText}
                </p>
                {currentAllowanceValue && (
                    <p
                        className="flex items-center space-x-1 text-sm text-primary-grey-dark break-word mt-2"
                        title={`${Number(
                            formatUnits(currentAllowanceValue, tokenDecimals)
                        )} ${tokenName}`}
                    >
                        <span>Current allowance:</span>
                        {isCurrentAllowanceUnlimited ? (
                            <span className="text-xl"> &#8734;</span>
                        ) : (
                            <span>
                                {formatUnits(
                                    currentAllowanceValue,
                                    tokenDecimals
                                )}
                            </span>
                        )}
                        <span>{tokenName}</span>
                    </p>
                )}
            </div>
            <div className="flex flex-col space-y-3 px-6 pb-3">
                <AllowanceInput
                    onChange={(value) => setAllowance(value)}
                    setIsValid={(value) => setIsAllowanceValid(value)}
                    tokenDecimals={tokenDecimals}
                    tokenName={tokenName}
                    defaultValue={defaultAllowance}
                    currentAllowance={currentAllowanceValue}
                />
                <div className="flex flex-col">
                    <label className="text-[13px] font-medium text-primary-grey-dark mb-2">
                        Gas Price
                    </label>
                    {!isEIP1559Compatible ? (
                        <GasPriceSelector
                            defaultLevel={defaultGasOption || "medium"}
                            defaultGasLimit={defaultGas.gasLimit!}
                            defaultGasPrice={defaultGas.gasPrice!}
                            setGasPriceAndLimit={(gasPrice, gasLimit) => {
                                setTransactionGas({ gasPrice, gasLimit })
                            }}
                            showEstimationError={gasEstimationFailed}
                            isParentLoading={isLoading}
                        />
                    ) : (
                        <GasPriceComponent
                            defaultGas={{
                                defaultLevel: defaultGasOption || "medium",
                                feeData: {
                                    gasLimit: defaultGas.gasLimit,
                                    maxFeePerGas: defaultGas.maxFeePerGas!,
                                    maxPriorityFeePerGas:
                                        defaultGas.maxPriorityFeePerGas!,
                                },
                            }}
                            setGas={(gasFees) => {
                                setTransactionGas({
                                    ...gasFees,
                                })
                            }}
                            showEstimationError={gasEstimationFailed}
                            isParentLoading={isLoading}
                            displayOnlyMaxValue
                        />
                    )}
                </div>
                <AdvancedSettings
                    address={checksumFromAddress}
                    advancedSettings={transactionAdvancedData}
                    setAdvancedSettings={(
                        newSettings: TransactionAdvancedData
                    ) => {
                        setTransactionAdvancedData({
                            customNonce: newSettings.customNonce,
                            flashbots: newSettings.flashbots,
                        })
                    }}
                    buttonDisplay={false}
                    transactionId={transaction.id}
                />
                <div className="text-xs text-red-500 !mt-0">
                    {!hasBalance && "Insufficient funds."}
                </div>
            </div>
        </>
    )

    return (
        <PopupLayout
            header={
                <PopupHeader
                    close={false}
                    backButton={false}
                    title={"Allowance"}
                    networkIndicator
                >
                    {transactionCount > 1 && (
                        <div className="group relative">
                            <AiFillInfoCircle
                                size={26}
                                className="pl-2 text-primary-grey-dark cursor-pointer hover:text-primary-blue-default"
                            />
                            <Tooltip
                                content={`${transactionCount - 1} more ${
                                    transactionCount > 2
                                        ? "transactions"
                                        : "transaction"
                                }`}
                                className="-translate-x-2/3"
                            />
                        </div>
                    )}
                </PopupHeader>
            }
            footer={
                <PopupFooter>
                    <>
                        <ButtonWithLoading
                            buttonClass={Classes.liteButton}
                            label="Reject"
                            disabled={
                                !canUserSubmitTransaction(transaction.status)
                            }
                            onClick={reject}
                        />
                        <ButtonWithLoading
                            label={isRevoke ? "Revoke" : "Approve"}
                            disabled={
                                !hasBalance ||
                                !canUserSubmitTransaction(transaction.status) ||
                                !isAllowanceValid
                            }
                            onClick={approve}
                        />
                    </>
                </PopupFooter>
            }
            showProviderStatus
        >
            <WaitingDialog
                open={isOpen}
                status={status}
                titles={{
                    loading: titles?.loading || "Confirming...",
                    success: titles?.success || "Success",
                    error: titles?.error || "Error",
                }}
                texts={{
                    loading: texts?.loading || "Updating token allowance...",
                    success: texts?.success || "Updated token allowance.",
                    error: texts?.error || "Something went wrong",
                }}
                clickOutsideToClose={false}
                txHash={transaction.transactionParams.hash}
                timeout={DAPP_FEEDBACK_WINDOW_TIMEOUT}
                onDone={() => {
                    if (!isManuallyRejected && status === "error") {
                        updateTransactionStatus(
                            transaction.id,
                            TransactionStatus.UNAPPROVED
                        ).then(() => {
                            transaction.status = TransactionStatus.UNAPPROVED
                        })
                    }
                    closeDialog()
                }}
                gifs={gifs}
                hideButton
                showCloseButton
            />
            {(isTokenLoading || isNameLoading) && <LoadingOverlay />}
            <CheckBoxDialog
                message={`Approval request was sent with an account that's different from the selected one in your wallet. \n\n Please select if you want to continue or reject the transaction.`}
                onClose={() => {
                    setAccountWarningClosed(true)
                }}
                onCancel={reject}
                onConfirm={(saveChoice) => {
                    if (saveChoice) {
                        setUserSettings({
                            ...settings,
                            hideAddressWarning: true,
                        })
                    }
                }}
                title="Different address detected"
                open={
                    differentAddress &&
                    !accountWarningClosed &&
                    !hideAddressWarning &&
                    !isLoading
                }
                closeText="Reject"
                confirmText="Continue"
                showCheckbox
                checkboxText="Don't show this warning again"
            />
            <div className="px-6 py-2 flex flex-row items-center">
                <AccountIcon
                    className="w-10 h-10"
                    fill={getAccountColor(account.address)}
                />
                <div className="relative flex flex-col group space-y-1 ml-4">
                    <span className="text-sm font-semibold">
                        {formatName(account.name, 15)}
                    </span>
                    <span
                        className="text-xs text-primary-grey-dark truncate"
                        title={account.address}
                    >
                        {formatHash(account.address)}
                    </span>
                </div>
                <div className="ml-auto flex flex-col items-end space-x-1">
                    <div
                        className="flex flex-row items-center"
                        title={`${formatName(assetBalance, 18)} ${tokenName}`}
                    >
                        <span className="text-xs text-primary-grey-dark truncate">
                            {`${formatName(assetBalance, 18)}`}
                        </span>
                        <img
                            src={tokenLogo || unknownTokenIcon}
                            onError={(e) => {
                                ;(e.target as any).onerror = null
                                ;(e.target as any).src = unknownTokenIcon
                            }}
                            alt={tokenName}
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
                                    balance || "0",
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
                                        balance || "0",
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
                vendor={getDeviceFromAccountType(account.accountType)}
                address={account.address}
            />
        </PopupLayout>
    )
}

export default ApproveAssetPage
