import { useCallback, useEffect, useLayoutEffect, useState } from "react"

import { useForm } from "react-hook-form"

// Components
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import {
    AssetListType,
    AssetSelection,
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
    const [allowAmountZero, setAllowAmountZero] = useState<boolean>(true)
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

    const [isGasLoading, setIsGasLoading] = useState(true)
    const [usingMax, setUsingMax] = useState(false)
    const [nativeCurrencyAmt, setNativeCurrency] = useState(0)

    const [selectedToken, setSelectedToken] = useState<TokenWithBalance>(
        preSelectedAsset ? preSelectedAsset : nativeToken
    )

    const { gasPricesLevels } = useGasPriceData()

    const [selectedGas, setSelectedGas] = useState<TransactionFeeData>({
        gasLimit: BigNumber.from(0),
        gasPrice: isEIP1559Compatible ? undefined : BigNumber.from(0),
        maxPriorityFeePerGas: isEIP1559Compatible
            ? BigNumber.from(0)
            : undefined,
        maxFeePerGas: isEIP1559Compatible ? BigNumber.from(0) : undefined,
    })

    const [defaultGas, setDefaultGas] = useState<TransactionFeeData>({
        gasLimit: SEND_GAS_COST,
        gasPrice: BigNumber.from(gasPricesLevels.average.gasPrice ?? 0),
    })

    const [gasEstimationFailed, setGasEstimationFailed] = useState(false)

    const [transactionAdvancedData, setTransactionAdvancedData] =
        useState<TransactionAdvancedData>({})

    const { status, isOpen, dispatch, texts, titles, closeDialog, gifs } =
        useTransactionWaitingDialog(
            currentTransaction
                ? {
                      id: currentTransaction?.id,
                      status: currentTransaction?.status,
                      error: currentTransaction?.error as Error,
                      epochTime: currentTransaction?.approveTime,
                      qrParams: currentTransaction.qrParams,
                  }
                : undefined,
            HardwareWalletOpTypes.SIGN_TRANSACTION,
            accountType,
            {
                reject: useCallback(() => {
                    if (currentTransaction?.id) {
                        rejectTransaction(currentTransaction?.id)
                    }
                }, [currentTransaction?.id]),
            }
        )

    const isLoading = status === "loading" && isOpen

    const calcNativeCurrency = () => {
        if (!selectedToken) return

        try {
            const amount: number = Number(getValues().amount)
            const assetAmount: number = !isNaN(amount) && amount ? amount : 0
            const decimals = selectedToken?.token.decimals || DEFAULT_DECIMALS
            const symbol =
                selectedToken?.token.symbol.toUpperCase() ||
                network.nativeCurrency.symbol
            const txAmount: BigNumber = parseUnits(
                assetAmount.toString(),
                decimals
            )
            setNativeCurrency(
                toCurrencyAmount(
                    txAmount,
                    getValueByKey(blankState.exchangeRates, symbol, 0),
                    decimals
                )
            )
        } catch {}
    }

    const schema = GetAmountYupSchema(
        balance,
        selectedToken,
        selectedGas,
        isEIP1559Compatible,
        allowAmountZero
    )

    const {
        register,
        handleSubmit,
        clearErrors,
        setValue,
        getValues,
        trigger,
        watch,
        formState: { errors },
    } = useForm<AmountFormData>({
        resolver: yupResolver(schema),
        defaultValues: { asset: selectedToken.token.address },
    })
    const { checkDeviceIsLinked, isDeviceUnlinked, resetDeviceLinkStatus } =
        useCheckAccountDeviceLinked()

    const onSubmit = handleSubmit(async (data: AmountFormData) => {
        if (!selectedToken) return setError("Select a token first.")

        // Value
        const value = usingMax
            ? getMaxTransactionAmount()
            : parseUnits(
                  data.amount.toString(),
                  selectedToken!.token.decimals || DEFAULT_DECIMALS // Default to eth decimals
              )
        dispatch({ type: "open", payload: { status: "loading" } })

        const isLinked = await checkDeviceIsLinked()
        if (!isLinked) {
            closeDialog()
            return
        }

        // Validation
        let balanceValidation: boolean = false
        let errorMessage: string = ""
        if (selectedToken.token.address === nativeToken.token.address) {
            balanceValidation = EtherSendBalanceValidation(
                balance,
                value,
                selectedGas,
                isEIP1559Compatible
            )
            errorMessage = `You don't have enough funds to send ${formatUnits(
                value,
                network.nativeCurrency.decimals
            )} ${network.nativeCurrency.symbol} + ${formatUnits(
                selectedGas.gasPrice ?? selectedGas.maxFeePerGas!,
                network.nativeCurrency.decimals
            )} ${network.nativeCurrency.symbol} (Gas cost)`
        } else {
            balanceValidation = GasCostBalanceValidation(
                balance,
                selectedGas,
                isEIP1559Compatible
            )
            errorMessage = `You don't have enough funds for the transaction gas cost ${formatUnits(
                selectedGas.gasPrice ?? selectedGas.maxFeePerGas!,
                network.nativeCurrency.decimals
            )} ${network.nativeCurrency.symbol}`
            if (balanceValidation) {
                balanceValidation = TokenSendBalanceValidation(
                    selectedToken.balance,
                    value
                )
                errorMessage = `You don't have enough funds to send ${formatUnits(
                    value,
                    selectedToken.token.decimals
                )} ${selectedToken.token.symbol}`
            }
        }

        if (!balanceValidation) {
            setError(errorMessage)
            dispatch({
                type: "setStatus",
                payload: { status: "error", texts: { error: errorMessage } },
            })
            return
        }

        // Send
        try {
            let sendPromise = null
            if (selectedToken.token.address === nativeToken.token.address) {
                sendPromise = sendEther(
                    receivingAddress,
                    selectedGas as TransactionFeeData,
                    value,
                    transactionAdvancedData
                )
            } else {
                sendPromise = sendToken(
                    selectedToken.token.address,
                    receivingAddress,
                    selectedGas as TransactionFeeData,
                    value,
                    transactionAdvancedData
                )
            }

            setPersistedData((prev: SendConfirmPersistedState) => ({
                ...prev,
                submitted: true,
            }))

            // clear history so that the user comes back to the home page if he clicks away
            // Hw accounts needs user interaction before submitting the TX, so that we may want the
            // user come back to this screen after reopening.
            if (!isHardwareWallet(accountType)) {
                clearLocationRecovery()
                //clean the window.localStorage
                setPersistedData(INITIAL_VALUE_PERSISTED_DATA)
            }

            //await for the send promise.
            await sendPromise
        } catch (error: any) {
            setPersistedData((prev: SendConfirmPersistedState) => ({
                ...prev,
                submitted: false,
            }))
        }
    })

    const getMaxTransactionAmount = (): BigNumber => {
        if (!selectedToken?.balance) return BigNumber.from("0")

        let maxTransactionAmount = BigNumber.from("0")

        // Check against balance only if selected token is native network currency, otherwise set max as selectedToken balance
        // and run the gas check on yup validation
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
        calcNativeCurrency()
    }

    const handleChangeAmount = (newAmount: string) => {
        let value = newAmount
            ? newAmount
                  .replace(/[^0-9.,]/g, "")
                  .replace(",", ".")
                  .replace(/(\..*?)\..*/g, "$1")
            : ""

        if (value === ".") {
            value = ""
        }

        if (value === "") {
            setValue("amount", "")
            clearErrors("amount")
        } else {
            setValue("amount", value, {
                shouldValidate: true,
            })
        }

        calcNativeCurrency()

        setPersistedData((prev: SendConfirmPersistedState) => ({
            ...prev,
            amount: value,
        }))
    }

    const handleChangeAsset = (asset: TokenWithBalance, cleanAmount = true) => {
        setUsingMax(false)
        setAllowAmountZero(true)
        if (cleanAmount) {
            handleChangeAmount("")
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

    const fetchGasLimit = useCallback(async () => {
        try {
            setIsGasLoading(true)

            const amount = watch("amount")

            const hasTokenBalance = BigNumber.from(selectedToken.balance).gt(
                Zero
            )

            let estimateValue = hasTokenBalance
                ? parseUnits(amount || "1", selectedToken.token.decimals)
                : Zero

            //send a value bigger than the account's balance will make the request to fail
            if (estimateValue.gt(selectedToken.balance)) {
                estimateValue = BigNumber.from(selectedToken.balance)
            }

            let { gasLimit, estimationSucceeded } =
                await getSendTransactionGasLimit(
                    selectedToken.token.address,
                    receivingAddress,
                    estimateValue
                )

            // In case the estimation failed but user has no balance on the selected token, we won't display the estimation error.
            if (!hasTokenBalance && !estimationSucceeded) {
                estimationSucceeded = true
            }

            setGasEstimationFailed(!estimationSucceeded)

            let gasPrice
            if (!isEIP1559Compatible) {
                gasPrice = await getLatestGasPrice()
            }

            setDefaultGas({
                gasLimit: BigNumber.from(gasLimit),
                gasPrice: isEIP1559Compatible
                    ? undefined
                    : BigNumber.from(gasPrice),
            })

            setSelectedGas({
                ...selectedGas,
                gasLimit: BigNumber.from(gasLimit),
            })
        } catch (error) {
            log.error("error ", error)
            if (error.message.match(/bigger than zero/gi)) {
                setAllowAmountZero(false)
            }
        } finally {
            setIsGasLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        setIsGasLoading,
        setSelectedGas,
        selectedToken,
        receivingAddress,
        isEIP1559Compatible,
    ])

    useEffect(() => {
        const checkIfSendingToTokenAddress = async () => {
            if (
                receivingAddress.toLowerCase() ===
                selectedToken.token.address.toLowerCase()
            ) {
                setShowSendingToTokenAddressWarning(true)
            }
        }

        fetchGasLimit()
        checkIfSendingToTokenAddress()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedToken, fetchGasLimit])

    // Effect triggered on selected gas change to update max amount if needed and recalculate validations.
    useEffect(() => {
        usingMax && setMaxTransactionAmount(usingMax)
        getValues().amount && trigger("amount")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedGas])

    const [inputFocus, setInputFocus] = useState(false)
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
                        type="submit"
                        label="Confirm"
                        isLoading={isGasLoading || isLoading}
                        disabled={
                            errors.amount !== undefined ||
                            isLoading ||
                            isGasLoading ||
                            inputFocus
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

                        {/* Amount */}
                        <div
                            className={classnames(
                                "flex flex-col",
                                !errors.amount && "mb-3"
                            )}
                        >
                            <div className="flex flex-row">
                                <div className="flex items-start w-1/3">
                                    <label
                                        htmlFor="amount"
                                        className="ml-1 mb-2 text-[13px] font-medium text-primary-grey-dark"
                                    >
                                        Amount
                                    </label>
                                </div>
                            </div>

                            <div
                                className={classnames(
                                    Classes.greySection,
                                    inputFocus && "bg-primary-grey-hover",
                                    errors.amount && "border-red-400"
                                )}
                            >
                                <div className="flex flex-col items-start">
                                    <input
                                        id="amount"
                                        type="text"
                                        {...register("amount")}
                                        className={classnames(
                                            Classes.blueSectionInput
                                        )}
                                        placeholder={`0 ${
                                            selectedToken
                                                ? selectedToken.token.symbol
                                                : ""
                                        }`}
                                        autoComplete="off"
                                        autoFocus={true}
                                        onFocus={() => setInputFocus(true)}
                                        onBlur={() => {
                                            setInputFocus(false)
                                            fetchGasLimit()
                                        }}
                                        onKeyDown={(e) => {
                                            setUsingMax(false)
                                            const amt = Number(
                                                e.currentTarget.value
                                            )
                                            if (
                                                !isNaN(Number(e.key)) &&
                                                !isNaN(amt) &&
                                                amt >= Number.MAX_SAFE_INTEGER
                                            ) {
                                                e.preventDefault()
                                                e.stopPropagation()
                                            }
                                        }}
                                        onInput={(e: any) =>
                                            handleChangeAmount(e.target.value)
                                        }
                                    />
                                    <span className="text-xs text-primary-grey-dark">
                                        {formatCurrency(nativeCurrencyAmt, {
                                            currency: blankState.nativeCurrency,
                                            locale_info: blankState.localeInfo,
                                            showSymbol: false,
                                        })}
                                    </span>
                                </div>
                                <div className="w-1/5">
                                    <span
                                        className={classnames(
                                            "float-right rounded-md cursor-pointer border p-1",
                                            usingMax
                                                ? "bg-gray-500 border-gray-500 text-white hover:bg-gray-400 hover:border-gray-400"
                                                : "bg-gray-300 border-gray-300 hover:bg-gray-400 hover:border-gray-400",
                                            !HasBalance(selectedToken) &&
                                                "pointer-events-none text-primary-grey-dark"
                                        )}
                                        title="Use all the available funds"
                                        onClick={() => {
                                            if (HasBalance(selectedToken)) {
                                                setMaxTransactionAmount(
                                                    !usingMax
                                                )
                                                fetchGasLimit()
                                            }
                                        }}
                                    >
                                        max
                                    </span>
                                </div>
                            </div>
                            {!error && (
                                <div
                                    className={`${
                                        errors.amount?.message
                                            ? "pl-1 my-2"
                                            : null
                                    }`}
                                >
                                    <ErrorMessage>
                                        {errors.amount?.message}
                                    </ErrorMessage>
                                </div>
                            )}
                        </div>

                        {/* Speed */}
                        <label className="ml-1 mb-2 text-[13px] font-medium text-primary-grey-dark">
                            Gas Price
                        </label>

                        {!isEIP1559Compatible ? (
                            <GasPriceSelector
                                defaultLevel={
                                    blankState.defaultGasOption || "medium"
                                }
                                defaultGasLimit={defaultGas.gasLimit!}
                                defaultGasPrice={defaultGas.gasPrice!}
                                setGasPriceAndLimit={(gasPrice, gasLimit) => {
                                    setSelectedGas({ gasPrice, gasLimit })
                                }}
                                isParentLoading={isGasLoading}
                                showEstimationError={gasEstimationFailed}
                            />
                        ) : (
                            <GasPriceComponent
                                defaultGas={{
                                    defaultLevel:
                                        blankState.defaultGasOption || "medium",
                                    feeData: {
                                        gasLimit: defaultGas.gasLimit!,
                                    },
                                }}
                                isParentLoading={isGasLoading}
                                setGas={(gasFees) => {
                                    setSelectedGas({
                                        ...gasFees,
                                    })
                                }}
                                showEstimationError={gasEstimationFailed}
                                displayOnlyMaxValue
                            />
                        )}
                        <div className="mt-3">
                            <AdvancedSettings
                                address={address}
                                advancedSettings={transactionAdvancedData}
                                display={{
                                    nonce: true,
                                    flashbots: false,
                                    slippage: false,
                                }}
                                setAdvancedSettings={(
                                    newSettings: TransactionAdvancedData
                                ) => {
                                    setTransactionAdvancedData({
                                        customNonce: newSettings.customNonce,
                                    })
                                }}
                                buttonDisplay={false}
                            />
                        </div>
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
