import { useState, useEffect, useRef, useCallback } from "react"
import { Redirect } from "react-router-dom"
import { BsFileEarmarkText } from "react-icons/bs"
import { AiFillInfoCircle } from "react-icons/ai"
import { formatUnits } from "@ethersproject/units"
import { getAddress } from "@ethersproject/address"
import { HiOutlineExclamationCircle } from "react-icons/hi"

import { BigNumber } from "@ethersproject/bignumber"

// Styles
import { Classes, classnames } from "../../styles"

// Components
import PopupFooter from "../../components/popup/PopupFooter"
import PopupLayout from "../../components/popup/PopupLayout"
import AccountIcon from "../../components/icons/AccountIcon"
import CopyTooltip from "../../components/label/СopyToClipboardTooltip"
import Tooltip from "../../components/label/Tooltip"
import LoadingOverlay from "../../components/loading/LoadingOverlay"
import LoadingDots from "../../components/loading/LoadingDots"
import GasPriceComponent from "../../components/transactions/GasPriceComponent"
import CheckBoxDialog from "../../components/dialog/CheckboxDialog"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import WaitingDialog from "../../components/dialog/WaitingDialog"
import { AdvancedSettings } from "../../components/transactions/AdvancedSettings"
import { GasPriceSelector } from "../../components/transactions/GasPriceSelector"
import GenericTooltip from "../../components/label/GenericTooltip"
import ClickableText from "../../components/button/ClickableText"

// Asset
import arrowRight from "../../assets/images/icons/arrow_right_black.svg"

// Context
import { useSelectedAccountBalance } from "../../context/hooks/useSelectedAccountBalance"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useNonSubmittedExternalTransaction } from "../../context/hooks/useNonSubmittedExternalTransaction"
import useNextRequestRoute from "../../context/hooks/useNextRequestRoute"
import { useUserSettings } from "../../context/hooks/useUserSettings"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { TransactionFeeData } from "@block-wallet/background/controllers/erc-20/transactions/SignedTransaction"
import {
    TransactionAdvancedData,
    TransactionMeta,
} from "@block-wallet/background/controllers/transactions/utils/types"
import {
    confirmTransaction,
    getNextNonce,
    rejectTransaction,
    setUserSettings,
} from "../../context/commActions"

// Utils
import { formatName } from "../../util/formatAccount"
import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import { getAccountColor } from "../../util/getAccountColor"
import { formatNumberLength } from "../../util/formatNumberLength"
import {
    HardwareWalletOpTypes,
    TransactionCategories,
} from "../../context/commTypes"
import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import {
    calculateGasPricesFromTransactionFees,
    calculateTransactionGas,
    estimatedGasExceedsBaseHigherThreshold,
    estimatedGasExceedsBaseLowerThreshold,
} from "../../util/gasPrice"

import useCheckAccountDeviceLinked from "../../util/hooks/useCheckAccountDeviceLinked"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import { useTransactionById } from "../../context/hooks/useTransactionById"
import useDebouncedState from "../../util/hooks/useDebouncedState"
import { DAPP_FEEDBACK_WINDOW_TIMEOUT } from "../../util/constants"
import useCopyToClipboard from "../../util/hooks/useCopyToClipboard"
import { getDeviceFromAccountType } from "../../util/hardwareDevice"
import TransactionDetails from "../../components/transactions/TransactionDetails"
import { useTransactionWaitingDialog } from "../../context/hooks/useTransactionWaitingDialog"
import { canUserSubmitTransaction } from "../../util/transactionUtils"
import DAppPopupHeader from "../../components/dApp/DAppPopupHeader"

const TransactionConfirmPage = () => {
    //Retrieves all the transactions to be processed
    const { transaction: nextTransaction, transactionCount } =
        useNonSubmittedExternalTransaction()
    const route = useNextRequestRoute()
    const [currentTx, setCurrentTx] = useDebouncedState<TransactionMeta>(
        nextTransaction,
        DAPP_FEEDBACK_WINDOW_TIMEOUT
    )

    useEffect(() => {
        //only override the transactionId when there is another one to process
        //to avoid passing an empty transactionId to the child component and break the UI.
        setCurrentTx(nextTransaction)
    }, [nextTransaction, setCurrentTx])

    return currentTx?.id &&
        currentTx?.transactionCategory !==
            TransactionCategories.TOKEN_METHOD_APPROVE ? (
        <TransactionConfirm
            transactionId={currentTx.id!}
            transactionCount={transactionCount}
        />
    ) : (
        <Redirect to={route} />
    )
}

const TransactionConfirm: React.FC<{
    transactionId: string
    transactionCount: number
}> = ({ transactionId, transactionCount }) => {
    //Hooks
    const {
        accounts,
        exchangeRates,
        nativeCurrency,
        localeInfo,
        networkNativeCurrency,
        selectedAddress,
        settings,
        defaultGasOption,
    } = useBlankState()!
    const { isEIP1559Compatible, defaultNetworkLogo } = useSelectedNetwork()
    const [gasPriceThresholdWarning, setGasPriceThresholdWarning] = useState<{
        message?: string
        title?: string
        dialogOpen: boolean
    }>({
        message: "",
        title: "",
        dialogOpen: false,
    })
    const { hideAddressWarning } = useUserSettings()
    const { isDeviceUnlinked, checkDeviceIsLinked, resetDeviceLinkStatus } =
        useCheckAccountDeviceLinked()
    const network = useSelectedNetwork()
    const { transaction: txById, params } = useTransactionById(transactionId)
    // At this point transactionId is ensured.
    const transaction = txById!

    // Flag to detect if the transaction was triggered using an address different to the active one
    const checksumFromAddress = getAddress(params.from!)
    const differentAddress = checksumFromAddress !== selectedAddress
    const [dialogClosed, setDialogClosed] = useState(false)

    const selectedAccountBalance = useSelectedAccountBalance()
    // If differentAddress, fetch the balance of that address instead of the selected one.
    const balance = differentAddress
        ? accounts[checksumFromAddress].balances[network.chainId]
              .nativeTokenBalance ?? BigNumber.from("0")
        : selectedAccountBalance

    // State variables
    const ethExchangeRate = exchangeRates[networkNativeCurrency.symbol]
    const [isLoading, setIsLoading] = useState(true)
    const [hasDetails, setHasDetails] = useState(false)

    const [hasBalance, setHasBalance] = useState(true)
    const { onCopy, copied } = useCopyToClipboard()
    const [gasEstimationFailed, setGasEstimationFailed] = useState(false)

    const [gasCost, setGasCost] = useState<BigNumber>(
        params.gasLimit.mul(params.gasPrice ?? params.maxFeePerGas!)
    )
    const [total, setTotal] = useState<BigNumber>(gasCost.add(params.value))
    const [totalInNativeCurrency, setTotalInNativeCurrency] = useState(
        toCurrencyAmount(
            total,
            ethExchangeRate,
            network.nativeCurrency.decimals
        )
    )

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
    // const [error, setError] = useState<string>("")
    const [transactionAdvancedData, setTransactionAdvancedData] =
        useState<TransactionAdvancedData>({})
    const nonceRef = useRef(0)

    const description =
        transaction.methodSignature?.name ??
        transaction.transactionCategory?.toString()
    const account = accounts[getAddress(params.from!)]
    const accountName = account ? account.name : "BlockWallet"

    const { status, isOpen, dispatch, texts, titles, closeDialog, gifs } =
        useTransactionWaitingDialog(
            transaction
                ? {
                      status: transaction.status,
                      error: transaction.error as Error,
                      epochTime: transaction?.approveTime,
                      qrParams: transaction?.qrParams,
                  }
                : undefined,
            HardwareWalletOpTypes.SIGN_TRANSACTION,
            account.accountType,
            {
                reject: useCallback(() => {
                    if (transactionId) {
                        rejectTransaction(transactionId)
                    }
                }, [transactionId]),
            }
        )

    const calcTranTotals = () => {
        const gas = calculateTransactionGas(
            transactionGas.gasLimit!,
            transactionGas.gasPrice,
            transactionGas.maxFeePerGas!
        )

        const totalCalc = gas.add(params.value)

        setGasCost(gas)
        setTotal(totalCalc)
        setHasBalance(totalCalc.lt(balance))
        setTotalInNativeCurrency(
            toCurrencyAmount(
                totalCalc,
                ethExchangeRate,
                network.nativeCurrency.decimals
            )
        )
    }

    useEffect(() => {
        getNextNonce(selectedAddress).then((nonce) => {
            nonceRef.current = nonce
        })
    }, [selectedAddress])

    // To prevent calculations on every render, force dependency array to only check state value that impacts
    // Recalculate gas values when switching between transactions too.
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
        calcTranTotals()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactionGas, transactionId, transaction.loadingGasValues])

    const { estimatedBaseFee: baseFeePerGas, gasPricesLevels } =
        useGasPriceData()!

    useEffect(() => {
        if (
            !settings.hideEstimatedGasExceedsThresholdWarning &&
            !transaction.loadingGasValues
        ) {
            const estimatedGas = calculateTransactionGas(
                params.gasLimit,
                params.gasPrice,
                params.maxFeePerGas!
            )
            const { slow, fast } = gasPricesLevels
            let minValue = BigNumber.from(0),
                maxValue = BigNumber.from(0)

            if (isEIP1559Compatible) {
                minValue = calculateGasPricesFromTransactionFees(
                    {
                        gasLimit: params.gasLimit,
                        maxFeePerGas: BigNumber.from(slow.maxFeePerGas!),
                        maxPriorityFeePerGas: BigNumber.from(
                            slow.maxPriorityFeePerGas!
                        ),
                    },
                    BigNumber.from(baseFeePerGas)
                ).minValue
                maxValue = calculateGasPricesFromTransactionFees(
                    {
                        gasLimit: params.gasLimit,
                        maxFeePerGas: BigNumber.from(fast.maxFeePerGas!),
                        maxPriorityFeePerGas: BigNumber.from(
                            fast.maxPriorityFeePerGas!
                        ),
                    },
                    BigNumber.from(baseFeePerGas)
                ).maxValue
            } else {
                minValue = calculateTransactionGas(
                    params.gasLimit,
                    slow.gasPrice!
                )
                maxValue = calculateTransactionGas(
                    params.gasLimit,
                    fast.gasPrice!
                )
            }

            const isLower = estimatedGasExceedsBaseLowerThreshold(
                minValue,
                estimatedGas
            )
            if (isLower) {
                setGasPriceThresholdWarning({
                    title: "Low Gas Price",
                    message:
                        "The dApp suggests fees much lower than recommended.",
                    dialogOpen: true,
                })
            }
            const isHigher = estimatedGasExceedsBaseHigherThreshold(
                maxValue,
                estimatedGas
            )
            if (isHigher) {
                setGasPriceThresholdWarning({
                    title: "High Gas Price",
                    message:
                        "The dApp suggests fees much higher than recommended.",
                    dialogOpen: true,
                })
            }
        }
        // We only need to calculate these every new transaction and not run this on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactionId, isEIP1559Compatible, transaction.loadingGasValues])

    // Functions
    const confirm = async () => {
        try {
            dispatch({ type: "open", payload: { status: "loading" } })
            const isLinked = await checkDeviceIsLinked()
            if (!isLinked) {
                closeDialog()
                return
            }
            await confirmTransaction(
                transaction.id,
                transactionGas,
                transactionAdvancedData
            )
        } catch (e) {}
    }

    const reject = async () => {
        dispatch({
            type: "open",
            payload: {
                status: "loading",
                titles: { loading: "Rejecting..." },
                texts: { loading: "Rejecting transaction..." },
            },
        })
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 300)
        })
        await rejectTransaction(transactionId)
    }

    // Formats transaction value according to network native currency symbol length, reducing decimals
    // and wrapping the text
    const transactionValues = () => {
        const formattedValue = formatNumberLength(
            formatUnits(params.value!, network.nativeCurrency.decimals),
            network.nativeCurrency.decimals,
            false
        )

        return (
            <>
                <p className="text-sm font-semibold pb-1 break-word">
                    {/* <span className="text-xs pointer-events-none w-12/12 font-semibold"> */}
                    {transaction.origin}
                    {/* </span> */}
                </p>
                <GenericTooltip
                    top
                    className="w-60 p-2 ml-8 break-all"
                    content={
                        <div>
                            <p>
                                <span className="font-semibold">
                                    Total value:{" "}
                                </span>
                                {formatUnits(
                                    params.value!,
                                    network.nativeCurrency.decimals
                                )}{" "}
                                {networkNativeCurrency.symbol}
                            </p>
                        </div>
                    }
                >
                    <div className="flex items-center p-4 rounded-md bg-primary-grey-default justify-between  hover:bg-primary-grey-hover">
                        <div
                            className={classnames(
                                "flex flex-row items-center pointer-events-none",
                                "w-12/12"
                            )}
                        >
                            <img
                                src={defaultNetworkLogo}
                                alt={network.nativeCurrency.symbol}
                                width="20px"
                                height="18px"
                                draggable={false}
                            />
                            <span className="font-black pl-1 text-sm">
                                {formattedValue} {networkNativeCurrency.symbol}
                            </span>
                        </div>
                    </div>
                </GenericTooltip>
            </>
        )
    }

    const addressDialogIsOpen =
        differentAddress && !dialogClosed && !hideAddressWarning && !isLoading

    const gasExceedsThresholdDialogIsOpen =
        !isLoading &&
        !addressDialogIsOpen &&
        !settings.hideEstimatedGasExceedsThresholdWarning &&
        gasPriceThresholdWarning.dialogOpen

    return (
        <PopupLayout
            header={
                <DAppPopupHeader
                    title="Confirm"
                    requestCount={transactionCount}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        onClick={reject}
                        buttonClass={Classes.liteButton}
                        // Removed to prevent stuck txs.
                        //disabled={!canUserSubmitTransaction(transaction.status)}
                        label="Reject"
                    ></ButtonWithLoading>
                    <ButtonWithLoading
                        label="Confirm"
                        disabled={
                            !hasBalance ||
                            !canUserSubmitTransaction(transaction.status)
                        }
                        onClick={confirm}
                    />
                </PopupFooter>
            }
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
                    loading: texts?.loading || "Confirming the transaction...",
                    success:
                        texts?.success || "The transaction has been submitted.",
                    error: texts?.error || "Something went wrong",
                }}
                txHash={transaction.transactionParams.hash}
                clickOutsideToClose={false}
                timeout={DAPP_FEEDBACK_WINDOW_TIMEOUT}
                onDone={closeDialog}
                gifs={gifs}
                hideButton
                showCloseButton
            />
            <TransactionDetails
                transaction={transaction}
                open={hasDetails}
                onClose={() => setHasDetails(false)}
                nonce={transactionAdvancedData.customNonce ?? nonceRef.current}
            />
            <div className="flex flex-row items-center justify-between w-full px-6 py-4 border-b">
                {isLoading && <LoadingOverlay />}
                <CheckBoxDialog
                    message={`Transaction was sent with an account that's different from the selected one in your wallet. \n\n Please select if you want to continue or reject the transaction.`}
                    onClose={() => {
                        setDialogClosed(true)
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
                    open={addressDialogIsOpen}
                    closeText="Reject"
                    confirmText="Continue"
                    showCheckbox
                    checkboxText="Don't show this warning again"
                />
                <CheckBoxDialog
                    message={`${gasPriceThresholdWarning.message}\n\nYou can manually change the gas price by clicking on it.`}
                    onClose={() => {
                        setGasPriceThresholdWarning({
                            dialogOpen: false,
                        })
                    }}
                    onCancel={reject}
                    onConfirm={(saveChoice) => {
                        if (saveChoice) {
                            setUserSettings({
                                ...settings,
                                hideEstimatedGasExceedsThresholdWarning: true,
                            })
                        }
                    }}
                    title={gasPriceThresholdWarning.title || ""}
                    open={gasExceedsThresholdDialogIsOpen}
                    confirmText="Continue"
                    showCloseButton={false}
                    showCheckbox
                    checkboxText="Don't show this warning again"
                />

                <div className="flex flex-row items-center w-2/5 justify-start">
                    <div>
                        <AccountIcon
                            className="h-6 w-6"
                            fill={getAccountColor(params.from!)}
                        />
                    </div>
                    <span
                        title={accountName}
                        className="pl-2 font-semibold text-xs truncate ..."
                    >
                        {formatName(accountName, 24)}
                    </span>
                    {differentAddress && (
                        <div className="group relative">
                            <AiFillInfoCircle
                                size={20}
                                className="pl-2 text-yellow-600 cursor-pointer hover:text-yellow-700"
                            />
                            <Tooltip content="Account differs from the selected in your wallet" />
                        </div>
                    )}
                </div>

                <div className="flex flex-row items-center justify-center w-1/5 relative">
                    <div className="w-8 border rounded-full bg-white z-10">
                        <img
                            src={arrowRight}
                            className="p-2"
                            alt=""
                            draggable={false}
                        />
                    </div>
                    <div
                        className="absolute border-t transform rotate-90 z-0"
                        style={{ width: "63px" }}
                    ></div>
                </div>

                {params.to ? (
                    <div
                        className="relative flex flex-row items-center cursor-pointer group w-2/5 justify-end"
                        onClick={() => onCopy(params?.to)}
                    >
                        <AccountIcon className="h-6 w-6" fill="black" />
                        <span className="pl-2 font-semibold text-xs">
                            {params.to!.slice(0, 6)} ...{params.to!.slice(-4)}
                        </span>
                        <CopyTooltip copied={copied} />
                    </div>
                ) : (
                    <div className="flex flex-row items-center relative w-2/5 justify-end">
                        <BsFileEarmarkText size={24} />
                        <span className="pl-1 font-semibold text-sm">
                            New Contract
                        </span>
                    </div>
                )}
            </div>

            <div className="flex flex-col px-6 py-3 space-y-3 w-full">
                <div className="flex flex-row w-full items-center justify-start py-0.5 ">
                    <HiOutlineExclamationCircle
                        size={20}
                        className="text-primary-grey-dark font-semibold"
                    />
                    <div className="text-xs text-primary-grey-dark pl-2 font-medium capitalize flex items-center justify-between w-full">
                        {description ? (
                            <>
                                <GenericTooltip
                                    top
                                    className="w-60 p-2 -ml-48"
                                    disabled={description.length < 30}
                                    content={description}
                                >
                                    {formatName(description, 30)}
                                </GenericTooltip>
                                <ClickableText
                                    onClick={(e) => {
                                        e.preventDefault()
                                        setHasDetails(true)
                                    }}
                                >
                                    View details
                                </ClickableText>
                            </>
                        ) : (
                            <span>Loading{<LoadingDots />}</span>
                        )}
                    </div>
                </div>
                {transactionValues()}

                <div className="flex flex-col">
                    <label
                        className={classnames(
                            Classes.inputLabel,
                            "text-primary-grey-dark pb-2"
                        )}
                    >
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

                <div className="flex flex-col space-y-2">
                    <div
                        className={classnames(
                            "flex flex-col items-start px-4 pt-4 space-y rounded-md bg-primary-grey-default",
                            !hasBalance
                                ? "border border-red-400 pb-2"
                                : "border-opacity-0 border-transparent pb-4"
                        )}
                    >
                        <div className="flex flex-row">
                            <label
                                htmlFor="amount"
                                className={classnames(
                                    Classes.inputLabel,
                                    "text-primary-grey-dark"
                                )}
                            >
                                AMOUNT + {isEIP1559Compatible && " MAX "} GAS
                                FEE
                            </label>
                        </div>
                        <div className="flex flex-col w-full space-y-1">
                            <div className="flex flex-row items-center justify-between w-full font-semibold">
                                <span className="w-2/12 text-sm">Total:</span>
                                <span className="flex flex-row items-center justify-end w-10/12">
                                    <img
                                        src={defaultNetworkLogo}
                                        alt={network.nativeCurrency.symbol}
                                        width="20px"
                                        height="18px"
                                        draggable={false}
                                    />
                                    <span
                                        className="pl-1 text-base"
                                        title={
                                            formatUnits(
                                                total,
                                                network.nativeCurrency.decimals
                                            ) +
                                            ` ${network.nativeCurrency.symbol}`
                                        }
                                    >
                                        {formatNumberLength(
                                            formatUnits(
                                                total,
                                                network.nativeCurrency.decimals
                                            ),
                                            networkNativeCurrency.symbol
                                                .length > 3
                                                ? 12
                                                : 14
                                        )}{" "}
                                        {network.nativeCurrency.symbol}
                                    </span>
                                    {/*
                                    {selectedCurrency.toUpperCase()} */}
                                </span>
                            </div>
                            <span className="ml-auto text-xs text-primary-grey-dark">
                                {formatCurrency(totalInNativeCurrency, {
                                    currency: nativeCurrency,
                                    locale_info: localeInfo,
                                    showSymbol: false,
                                })}
                            </span>
                            <span className="text-xs text-red-500">
                                {!hasBalance && "Insufficient balance"}
                            </span>
                        </div>
                    </div>
                </div>
                <AdvancedSettings
                    address={checksumFromAddress}
                    transactionGasLimit={transactionGas.gasLimit}
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
                />
            </div>
            <HardwareDeviceNotLinkedDialog
                onDone={resetDeviceLinkStatus}
                isOpen={isDeviceUnlinked}
                address={account.address}
                vendor={getDeviceFromAccountType(account.accountType)}
            />
        </PopupLayout>
    )
}

export default TransactionConfirmPage
