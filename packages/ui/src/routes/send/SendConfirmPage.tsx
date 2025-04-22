import { useCallback, useEffect, useLayoutEffect, useState, useMemo } from "react"

import { useForm } from "react-hook-form"

// Components
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import {
    AssetListType,
    MemoizedAssetSelection as AssetSelection,
} from "../../components/assets/AssetSelection"
import { GasPriceSelector } from "../../components/transactions/GasPriceSelector"
import ErrorMessage from "../../components/error/ErrorMessage"

// Style
import classnames from "classnames"

// Utils
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import { InferType } from "yup"
import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits, parseUnits } from "@ethersproject/units"
import { Zero } from "@ethersproject/constants"
import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import { DEFAULT_DECIMALS, SEND_GAS_COST } from "../../util/constants"

// Hooks
import { useBlankState } from "../../context/background/backgroundHooks"
import {
    getLatestGasPrice,
    getSendTransactionGasLimit,
    sendEther,
    sendToken,
} from "../../context/commActions"

import { useSelectedAccountBalance } from "../../context/hooks/useSelectedAccountBalance"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import {
    TokenWithBalance,
    useTokensList,
} from "../../context/hooks/useTokensList"
import GasPriceComponent from "../../components/transactions/GasPriceComponent"

// Types
import PopupLayout from "../../components/popup/PopupLayout"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { Classes } from "../../styles"
import WaitingDialog from "../../components/dialog/WaitingDialog"
import WarningDialog from "../../components/dialog/WarningDialog"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import { AdvancedSettings } from "../../components/transactions/AdvancedSettings"
import { TransactionFeeData } from "@block-wallet/background/controllers/erc-20/transactions/SignedTransaction"
import { TransactionAdvancedData } from "@block-wallet/background/controllers/transactions/utils/types"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useLocationRecovery } from "../../util/hooks/useLocationRecovery"
import useLocalStorageState from "../../util/hooks/useLocalStorageState"
import useCheckAccountDeviceLinked from "../../util/hooks/useCheckAccountDeviceLinked"
import { getDeviceFromAccountType } from "../../util/hardwareDevice"
import { isHardwareWallet } from "../../util/account"
import { useTransactionWaitingDialog } from "../../context/hooks/useTransactionWaitingDialog"
import { HardwareWalletOpTypes } from "../../context/commTypes"
import { useInProgressInternalTransaction } from "../../context/hooks/useInProgressInternalTransaction"
import { rejectTransaction } from "../../context/commActions"
import { getValueByKey } from "../../util/objectUtils"
import { AddressDisplay } from "../../components/addressBook/AddressDisplay"
import { useAccountNameByAddress } from "../../context/hooks/useAccountNameByAddress"
import log from "loglevel"
import { AmountInput } from "../../components/send/AmountInput"
import { useGasEstimation } from "../../context/hooks/useGasEstimation"
import { GasSettings } from "../../components/send/GasSettings"
import { useSendTransaction } from "../../context/hooks/useSendTransaction"

// Debounce utility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debounce = <F extends (...args: any[]) => any>(
    func: F,
    waitFor: number
) => {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
        new Promise((resolve) => {
            if (timeout) {
                clearTimeout(timeout)
            }

            timeout = setTimeout(() => resolve(func(...args)), waitFor)
        })
}

// Schema
const GetAmountYupSchema = (
    balance: BigNumber,
    asset: TokenWithBalance | undefined,
    selectedGas: TransactionFeeData,
    isEIP1559Compatible: boolean | undefined,
    allowAmountZero: boolean
) => {
    return yup.object({
        asset: yup
            .string()
            .required("No asset selected.")
            .test("is-valid", "Please select an asset", (value) => {
                return !!value || value !== "" || value.length !== 42
            }),
        amount: yup
            .string()
            .test("is-correct", "Please select an asset.", () => {
                if (!asset) {
                    return false
                }
                return true
            })
            .required("No transaction amount provided")
            .test("is-number", "Please enter a number.", (value) => {
                if (typeof value != "string") return false
                return !isNaN(parseFloat(value))
            })
            .test("is-correct", "Please enter a number.", (value) => {
                if (typeof value != "string") return false
                const regexp = /^\d+(\.\d+)?$/
                return regexp.test(value)
            })
            .test(
                "is-correct",
                "Amount must be a positive number.",
                (value) => {
                    if (typeof value != "string") return false
                    return value === "0" || parseFloat(value) > 0
                }
            )
            .test(
                "is-zero-allowed",
                "Transfer amount must greater than zero for this token.",
                (value) => {
                    if (!allowAmountZero) {
                        if (typeof value != "string") return false
                        return parseFloat(value) > 0
                    }
                    return true
                }
            )
            .test("is-decimals", "Too many decimal numbers.", (value) => {
                if (typeof value != "string") return false
                if (!value.includes(".")) return true
                const decimals = asset?.token.decimals || DEFAULT_DECIMALS
                const valueDecimals = value.split(".")[1].length
                return valueDecimals <= decimals
            }),
        selectedGas: yup.string(),
        isEIP1559Compatible: yup.boolean(),
    })
}

type AmountFormData = InferType<ReturnType<typeof GetAmountYupSchema>>

// Tools

const BalanceValidation = (balance: BigNumber, amount: BigNumber): boolean => {
    return BigNumber.from(balance).gte(BigNumber.from(amount))
}

const GasCostBalanceValidation = (
    balance: BigNumber,
    selectedGas: TransactionFeeData,
    isEIP1559Compatible?: boolean
): boolean => {
    return BalanceValidation(
        BigNumber.from(balance),
        BigNumber.from(selectedGas.gasLimit).mul(
            BigNumber.from(
                isEIP1559Compatible
                    ? selectedGas.maxFeePerGas
                    : selectedGas.gasPrice
            )
        )
    )
}
const EtherSendBalanceValidation = (
    balance: BigNumber,
    txAmount: BigNumber,
    selectedGas: TransactionFeeData,
    isEIP1559Compatible?: boolean
): boolean => {
    balance = BigNumber.from(balance)
    txAmount = BigNumber.from(txAmount)
    selectedGas.gasLimit = BigNumber.from(selectedGas.gasLimit)
    const gasPrice: BigNumber = BigNumber.from(
        isEIP1559Compatible ? selectedGas.maxFeePerGas : selectedGas.gasPrice
    )

    txAmount = txAmount.add(selectedGas.gasLimit.mul(gasPrice))
    return BalanceValidation(balance, txAmount)
}
const TokenSendBalanceValidation = (
    balance: BigNumber,
    amount: BigNumber
): boolean => {
    return BalanceValidation(BigNumber.from(balance), BigNumber.from(amount))
}

const HasBalance = (selectedToken: TokenWithBalance): boolean => {
    return selectedToken && !BigNumber.from(selectedToken.balance).isZero()
}

interface SendConfirmPersistedState {
    amount: string
    submitted: boolean
    asset: TokenWithBalance | null
    txId: string
}

const INITIAL_VALUE_PERSISTED_DATA = {
    asset: null,
    amount: "",
    submitted: false,
    txId: "",
}

// Page
const SendConfirmPage = () => {
    // Blank Hooks
    const { clear: clearLocationRecovery } = useLocationRecovery()
    const blankState = useBlankState()!
    const network = useSelectedNetwork()
    const history: any = useOnMountHistory()
    const balance = useSelectedAccountBalance()
    const { address, accountType } = useSelectedAccount()
    const receivingAddress = history.location.state.address
    const accountNameByAddress = useAccountNameByAddress(receivingAddress)
    const selectedAccountName =
        history.location.state.name ?? accountNameByAddress

    // Get data from window.localStorage
    const [persistedData, setPersistedData] =
        useLocalStorageState<SendConfirmPersistedState>("send.form", {
            initialValue: {
                ...INITIAL_VALUE_PERSISTED_DATA,
                submitted: false,
            },
            volatile: true,
        })

    const { transaction: currentTransaction, clearTransaction } =
        useInProgressInternalTransaction({ txId: persistedData.txId })

    useEffect(() => {
        if (
            currentTransaction?.id &&
            persistedData.submitted &&
            persistedData.txId !== currentTransaction?.id
        ) {
            if (isHardwareWallet(accountType)) {
                setPersistedData((prev: SendConfirmPersistedState) => ({
                    ...prev,
                    txId: currentTransaction?.id,
                }))
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTransaction?.id])

    useLayoutEffect(() => {
        // Tx was either rejected or submitted when the pop-up was closed.
        // If we opened back the pop-up, and there aren't any pending transactions,
        // we should redirect to the home page (this is only checked on component mount)
        if (
            !currentTransaction?.id &&
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

    // Restore persisted data on component mount in case the page
    // is being restored from a popup close
    const isEIP1559Compatible = network.isEIP1559Compatible
    const preSelectedAsset = persistedData?.asset
        ? persistedData.asset
        : (history.location.state.asset as TokenWithBalance)

    // Tokens
    const { nativeToken } = useTokensList()

    // State
    const [error, setError] = useState("")
    const [
        showSendingToTokenAddressWarning,
        setShowSendingToTokenAddressWarning,
    ] = useState(false)

    const [usingMax, setUsingMax] = useState(false)

    const [selectedToken, setSelectedToken] = useState<TokenWithBalance>(
        preSelectedAsset ? preSelectedAsset : nativeToken
    )

    const { gasPricesLevels } = useGasPriceData()

    // Initial default gas price (needed for the hook)
    const initialDefaultGasPrice = useMemo(
        () => BigNumber.from(gasPricesLevels.average.gasPrice ?? 0),
        [gasPricesLevels.average.gasPrice]
    )

    const {
        register,
        handleSubmit,
        clearErrors,
        setValue,
        getValues,
        trigger,
        watch,
        control,
        formState: { errors },
    } = useForm<AmountFormData>({
        resolver: yupResolver(GetAmountYupSchema(
            balance,
            selectedToken,
            { gasLimit: BigNumber.from(0), gasPrice: BigNumber.from(0) },
            isEIP1559Compatible,
            true
        )),
        defaultValues: { asset: selectedToken.token.address },
    })
    const { checkDeviceIsLinked, isDeviceUnlinked, resetDeviceLinkStatus } =
        useCheckAccountDeviceLinked()

    const watchedAmount = watch("amount");

    // Define getMaxTransactionAmount *before* useSendTransaction hook
    const getMaxTransactionAmount = (): BigNumber => {
        if (!selectedToken?.balance) return BigNumber.from("0")
        let maxTransactionAmount = BigNumber.from("0")
        if (
            selectedToken?.token.address === nativeToken.token.address &&
            GasCostBalanceValidation(balance, selectedGas, isEIP1559Compatible)
        ) {
            maxTransactionAmount = BigNumber.from(balance).sub(
                BigNumber.from(
                    isEIP1559Compatible
                        ? selectedGas.maxFeePerGas
                        : selectedGas.gasPrice
                ).mul(BigNumber.from(selectedGas.gasLimit))
            )
        } else {
            maxTransactionAmount = BigNumber.from(selectedToken?.balance)
        }
        return maxTransactionAmount
    }

    // Use the gas estimation hook
    const {
        isGasLoading,
        gasEstimationFailed,
        defaultGas,
        selectedGas,
        allowAmountZero,
        setSelectedGas,
    } = useGasEstimation({
        selectedToken,
        recipientAddress: receivingAddress,
        amountValue: watchedAmount,
        isEIP1559Compatible,
        initialDefaultGasPrice,
    });

    const [transactionAdvancedData, setTransactionAdvancedData] =
        useState<TransactionAdvancedData>({})

    // Use the send transaction hook
    const {
        submitTransaction,
        isSubmitting,
        submissionError,
        clearSubmissionError,
        dialogState,
    } = useSendTransaction({
        selectedToken,
        nativeToken,
        receivingAddress,
        selectedGas,
        transactionAdvancedData,
        balance,
        isEIP1559Compatible,
        accountType,
        usingMax,
        getMaxTransactionAmount,
        formData: getValues(),
    })

    const { isOpen, status, texts, titles, closeDialog, gifs } = dialogState
    const isLoading = isSubmitting
    const effectiveError = submissionError || error

    const handleFormSubmit = handleSubmit(() => {
        setError("");
        clearSubmissionError();
        submitTransaction();
    });

    const setMaxTransactionAmount = (_usingMax: boolean = usingMax) => {
        setUsingMax(_usingMax)
        if (_usingMax) {
            const maxTransactionAmount = getMaxTransactionAmount()
            const decimals = selectedToken?.token.decimals || DEFAULT_DECIMALS
            const formatAmount = formatUnits(
                BigNumber.from(maxTransactionAmount),
                decimals
            )
            setValue("amount", formatAmount, {
                shouldValidate: true,
            })
        } else {
            setValue("amount", "", {
                shouldValidate: false,
            })
            clearErrors("amount")
        }
    }

    const handleChangeAmount = useCallback(
        (newAmount: string) => {
            setValue("amount", newAmount, {
                shouldValidate: newAmount !== "", // Only validate if not empty
            })
            if (newAmount === "") {
                clearErrors("amount")
            }
            // Update persisted data
            setPersistedData((prev) => ({ ...prev, amount: newAmount }))
        },
        [setValue, clearErrors, setPersistedData]
    )

    const handleChangeAsset = (asset: TokenWithBalance, cleanAmount = true) => {
        setUsingMax(false)
        if (cleanAmount) {
            handleChangeAmount("") // Call the reintroduced function
        }
        setValue("asset", asset.token.address, {
            shouldValidate: true,
        })
        setSelectedToken(asset)
        setPersistedData((prev: SendConfirmPersistedState) => ({
            ...prev,
            asset,
        }))
    }

    useEffect(() => {
        if (persistedData?.asset) {
            handleChangeAsset(persistedData.asset, false)
        }
        if (persistedData?.amount) {
            handleChangeAmount(persistedData.amount)
        }
        //do this only on mounting.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const checkIfSendingToTokenAddress = async () => {
            if (
                selectedToken &&
                receivingAddress.toLowerCase() ===
                selectedToken.token.address.toLowerCase()
            ) {
                setShowSendingToTokenAddressWarning(true)
            }
        }

        checkIfSendingToTokenAddress()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedToken, receivingAddress])

    // Effect triggered on selected gas change to update max amount if needed and recalculate validations.
    useEffect(() => {
        usingMax && setMaxTransactionAmount(usingMax)
        if (getValues().amount) {
            trigger("amount")
        }
        // Dependencies are usingMax state and the selectedGas object.
        // Make sure setMaxTransactionAmount and trigger are stable (e.g., wrapped in useCallback if defined in component)
        // Since they come from react-hook-form and useState, they should be stable.
    }, [selectedGas, usingMax, trigger, getValues])

    // const [inputFocus, setInputFocus] = useState(false) // Managed by AmountInput now
    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Send"
                    disabled={isLoading}
                    keepState
                    networkIndicator
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        type="button"
                        label="Confirm"
                        isLoading={isLoading}
                        disabled={
                            !!errors.amount ||
                            !!errors.asset ||
                            isLoading ||
                            isGasLoading
                        }
                        onClick={handleFormSubmit}
                    />
                </PopupFooter>
            }
            showProviderStatus
        >
            <WaitingDialog
                open={isOpen}
                status={status}
                titles={{
                    loading: titles?.loading || "Sending...",
                    success: titles?.success || "Success",
                    error: titles?.error || "Error",
                }}
                texts={{
                    loading: texts?.loading || "Initiating the transfer...",
                    success: texts?.success || "You've initiated the transfer.",
                    error: texts?.error || error,
                }}
                txHash={currentTransaction?.transactionParams.hash}
                clickOutsideToClose={false}
                timeout={1500}
                gifs={gifs}
                onDone={() => {
                    if (status === "error") {
                        closeDialog()
                        setPersistedData((prev: SendConfirmPersistedState) => ({
                            ...prev,
                            submitted: false,
                            txId: "",
                        }))
                        clearTransaction()
                        return
                    }
                    history.push("/")
                }}
                showCloseButton
            />
            <WarningDialog
                open={showSendingToTokenAddressWarning}
                onDone={() => setShowSendingToTokenAddressWarning(false)}
                title="Sending to token contract address"
                message="You are trying to send tokens to the selected token's contract address. This might lead to a loss of funds. Please make sure you selected the correct address!"
            />
            <HardwareDeviceNotLinkedDialog
                onDone={resetDeviceLinkStatus}
                isOpen={isDeviceUnlinked}
                vendor={getDeviceFromAccountType(accountType)}
                accountType={accountType}
                address={address}
            />
            <div className="w-full h-full">
                <div
                    className="flex flex-col w-full h-full"
                    style={{ maxHeight: "452px" }}
                >
                    <AddressDisplay
                        receivingAddress={history.location.state.address}
                        selectedAccountName={selectedAccountName}
                    />

                    <div
                        className="flex flex-col px-6"
                        style={{ maxWidth: "100vw" }}
                    >
                        {/* Asset */}
                        <div
                            className={classnames(
                                !errors.asset?.message && "mb-3"
                            )}
                        >
                            <p className="ml-1 mb-2 text-[13px] font-medium text-primary-grey-dark">
                                Asset
                            </p>
                            <AssetSelection
                                register={register}
                                selectedAssetList={AssetListType.DEFAULT}
                                selectedAsset={selectedToken}
                                onAssetChange={handleChangeAsset}
                                error={errors.asset?.message}
                                topMargin={100}
                                bottomMargin={45}
                            />
                            {errors.asset?.message && (
                                <div className="pl-1 my-2">
                                    <ErrorMessage>
                                        {errors.asset?.message}
                                    </ErrorMessage>
                                </div>
                            )}
                        </div>

                        {/* Amount - Use the new component */}
                        <AmountInput
                            control={control}
                            register={register}
                            setValue={setValue}
                            getValues={getValues}
                            clearErrors={clearErrors}
                            errors={errors}
                            selectedToken={selectedToken}
                            getMaxTransactionAmount={getMaxTransactionAmount}
                            onAmountChange={(amount) => {
                                setPersistedData((prev) => ({ ...prev, amount }))
                            }}
                            onMaxClick={(isUsingMax) => {
                                setUsingMax(isUsingMax)
                            }}
                            blankState={blankState!}
                            nativeToken={nativeToken}
                            balance={balance}
                            selectedGas={selectedGas}
                            isEIP1559Compatible={isEIP1559Compatible}
                            disabled={isLoading || isGasLoading}
                        />

                        {/* Gas Settings Section - Use the new component */}
                        <GasSettings
                            isEIP1559Compatible={isEIP1559Compatible}
                            blankState={blankState!}
                            defaultGas={defaultGas}
                            selectedGas={selectedGas}
                            setSelectedGas={setSelectedGas}
                            isGasLoading={isGasLoading}
                            gasEstimationFailed={gasEstimationFailed}
                            address={address}
                            transactionAdvancedData={transactionAdvancedData}
                            setTransactionAdvancedData={setTransactionAdvancedData}
                        />

                        {/* General Error Display */}
                        <div className={`${error ? "pl-1 my-2" : null}`}>
                            <ErrorMessage>{error}</ErrorMessage>
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default SendConfirmPage
