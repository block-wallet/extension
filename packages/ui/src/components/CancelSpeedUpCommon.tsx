import { useMemo, useState, useEffect, useCallback } from "react"
import * as yup from "yup"
import { InferType } from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits, parseUnits } from "@ethersproject/units"
import classnames from "classnames"

// Components
import PopupFooter from "./popup/PopupFooter"
import PopupHeader from "./popup/PopupHeader"
import PopupLayout from "./popup/PopupLayout"
import { ButtonWithLoading } from "./button/ButtonWithLoading"
import ClickableText from "./button/ClickableText"
import TextInput from "./input/TextInput"
import DetailsDialog from "./dialog/DetailsDialog"
import WaitingDialog from "./dialog/WaitingDialog"

// Assets
import eth from "../assets/images/icons/ETH.svg"

// Hooks
import { useOnMountHistory } from "../context/hooks/useOnMount"
import { useSelectedNetwork } from "../context/hooks/useSelectedNetwork"
import { useGasPriceData } from "../context/hooks/useGasPriceData"
import { useSelectedAccountBalance } from "../context/hooks/useSelectedAccountBalance"

// Comms
import {
    HardwareWalletOpTypes,
    TransactionStatus,
    TransactionType,
} from "../context/commTypes"

import { rejectReplacementTransaction } from "../context/commActions"

// Utils
import { getTransactionType } from "../util/getTransactionType"
import {
    makeStringNumberFormField,
    handleChangeAmountGwei,
    handleChangeAmountWei,
    handleKeyDown,
} from "../util/form"
import formatTransactionValue from "../util/formatTransactionValue"
import {
    FeeMarketEIP1559Values,
    GasPriceValue,
} from "@block-wallet/background/controllers/transactions/TransactionController"
import { TransactionFeeData } from "@block-wallet/background/controllers/erc-20/transactions/SignedTransaction"
import { useTransactionById } from "../context/hooks/useTransactionById"
import { useTransactionWaitingDialog } from "../context/hooks/useTransactionWaitingDialog"
import { useSelectedAccount } from "../context/hooks/useSelectedAccount"
import useCheckAccountDeviceLinked from "../util/hooks/useCheckAccountDeviceLinked"
import HardwareDeviceNotLinkedDialog from "./dialog/HardwareDeviceNotLinkedDialog"
import { getDeviceFromAccountType } from "../util/hardwareDevice"
import log from "loglevel"

// Schema
export const formSchema = yup.object({
    gasLimit: makeStringNumberFormField("Gas limit is required", false),
    gasPrice: makeStringNumberFormField("Gas price is required", true),
    maxPriorityFeePerGas: makeStringNumberFormField(
        "Max tip is required",
        true
    ),
    maxFeePerGas: makeStringNumberFormField("Max fee is required", false),
})
export type formData = InferType<typeof formSchema>

type fees = {
    gasLimit: BigNumber
    gasPrice: BigNumber
    maxPriorityFeePerGas: BigNumber
    maxFeePerGas: BigNumber
}

type CancelAndSpeedUpProps = {
    title: string
    type: "cancel" | "speed up"
    children: (
        type: TransactionType,
        oldFees: fees,
        newFees: fees
    ) => React.ReactNode
    getSuggestedFees: (
        id: string
    ) => Promise<GasPriceValue | FeeMarketEIP1559Values>
    submitAction: (
        id: string,
        gasLimit: BigNumber,
        fees: FeeMarketEIP1559Values | GasPriceValue
    ) => Promise<void>
}

const calcGasPrice = (
    type: TransactionType,
    fees: Omit<fees, "maxPriorityFeePerGas">
) => {
    return (
        type !== TransactionType.FEE_MARKET_EIP1559
            ? fees.gasPrice
            : fees.maxFeePerGas
    ).mul(fees.gasLimit)
}

const CancelAndSpeedUpComponent = ({
    title,
    type,
    children,
    getSuggestedFees,
    submitAction,
}: CancelAndSpeedUpProps) => {
    const history: any = useOnMountHistory()
    const {
        nativeCurrency: networkNativeCurrency,
        iconUrls,
        gasLowerCap,
    } = useSelectedNetwork()
    const { estimatedBaseFee: baseFeePerGas } = useGasPriceData()
    const currentBalance = BigNumber.from(useSelectedAccountBalance())
    const { accountType, address } = useSelectedAccount()

    const [hasDialog, setHasDialog] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [customErrors, setCustomErrors] = useState({
        maxPriorityFeePerGas: "",
        maxFeePerGas: "",
        gasPrice: "",
    })
    const [warning, setWarning] = useState({
        gasLimit: "",
        maxPriorityFeePerGas: "",
        maxFeePerGas: "",
        gasPrice: "",
    })

    const txObj = useTransactionById(
        (
            history.location.state as {
                txId: string
            }
        ).txId
    )

    if (!txObj.transaction) {
        history.push("/")
    }

    const transaction = txObj.transaction!
    const [currentReplacementTxId, setCurrentReplacementTxId] = useState<
        string | undefined
    >(transaction?.replacedBy)

    const { transaction: replacementTx } = useTransactionById(
        currentReplacementTxId
    )

    useEffect(() => {
        if (!currentReplacementTxId && transaction?.replacedBy) {
            setCurrentReplacementTxId(transaction.replacedBy)
        }
    }, [transaction.replacedBy, currentReplacementTxId])

    useEffect(() => {
        // Tx was either rejected or submitted when the pop-up was closed.
        // If we opened back the pop-up, and there aren't any pending transactions,
        // we should redirect to the home page (this is only checked on component mount)
        if (
            (replacementTx &&
                [
                    TransactionStatus.SUBMITTED,
                    TransactionStatus.CONFIRMED,
                    TransactionStatus.FAILED,
                    TransactionStatus.DROPPED,
                ].includes(replacementTx?.status)) ||
            transaction?.status === TransactionStatus.CONFIRMED
        ) {
            history.push("/")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const {
        oldGasLimit,
        oldGasPrice,
        oldMaxFeePerGas,
        oldMaxPriorityFeePerGas,
    } = useMemo(() => {
        const params = transaction?.transactionParams

        return {
            oldGasLimit: BigNumber.from(params?.gasLimit ?? 1),
            oldGasPrice: BigNumber.from(params?.gasPrice ?? 1),
            oldMaxFeePerGas: BigNumber.from(params?.maxFeePerGas ?? 1),
            oldMaxPriorityFeePerGas: BigNumber.from(
                params?.maxPriorityFeePerGas ?? 1
            ),
        }
    }, [transaction])

    const [newFees, setNewFees] = useState({
        gasLimit: formatUnits(oldGasLimit, "wei"),
        gasPrice: formatUnits(oldGasPrice, "gwei"),
        maxPriorityFeePerGas: formatUnits(oldMaxPriorityFeePerGas, "gwei"),
        maxFeePerGas: formatUnits(oldMaxFeePerGas, "gwei"),
    })

    const [suggestedAmount, setSuggestedAmount] = useState({
        maxPriorityFeePerGas: oldMaxPriorityFeePerGas,
        maxFeePerGas: oldMaxFeePerGas,
        gasPrice: oldGasPrice,
    })

    const transactionType = getTransactionType(transaction.transactionParams)

    const {
        setValue,
        register,
        getValues,

        formState: { errors },
    } = useForm<formData>({
        resolver: yupResolver(formSchema),
        defaultValues: {
            gasLimit: formatUnits(
                transaction.transactionParams.gasLimit ?? BigNumber.from(1),
                "wei"
            ),
            gasPrice: "1",
            maxFeePerGas: "1",
            maxPriorityFeePerGas: "1",
        },
    })

    const { status, isOpen, dispatch, texts, titles, closeDialog, gifs } =
        useTransactionWaitingDialog(
            replacementTx
                ? {
                      id: replacementTx?.id,
                      status: replacementTx.status,
                      error: replacementTx.error as Error,
                      epochTime: replacementTx?.approveTime,
                      qrParams: transaction?.qrParams,
                  }
                : undefined,
            type === "cancel"
                ? HardwareWalletOpTypes.SIGN_CANCEL
                : HardwareWalletOpTypes.SIGN_SPEEDUP,
            accountType,
            {
                reject: useCallback(() => {
                    if (replacementTx?.id) {
                        rejectReplacementTransaction(replacementTx.id)
                    }
                }, [replacementTx?.id]),
            }
        )

    const { checkDeviceIsLinked, isDeviceUnlinked, resetDeviceLinkStatus } =
        useCheckAccountDeviceLinked()

    const [error, setError] = useState<
        | {
              type: "feeLow" | "mined" | "notEnoughFunds"
              message: string
          }
        | undefined
    >({
        type: "feeLow",
        message: "",
    })

    useEffect(() => {
        setIsLoading(true)

        getSuggestedFees(transaction.id)
            .then((price) => {
                if (transactionType !== TransactionType.FEE_MARKET_EIP1559) {
                    const { gasPrice } = price as GasPriceValue
                    setNewFees({
                        ...newFees,
                        gasPrice: formatUnits(gasPrice, "gwei"),
                    })

                    setValue("gasPrice", formatUnits(gasPrice, "gwei"))
                    setSuggestedAmount({
                        ...suggestedAmount,
                        gasPrice,
                    })
                } else {
                    const { maxFeePerGas, maxPriorityFeePerGas } =
                        price as FeeMarketEIP1559Values

                    setNewFees({
                        ...newFees,
                        maxFeePerGas: formatUnits(maxFeePerGas, "gwei"),
                        maxPriorityFeePerGas: formatUnits(
                            maxPriorityFeePerGas,
                            "gwei"
                        ),
                    })

                    setValue("maxFeePerGas", formatUnits(maxFeePerGas, "gwei"))
                    setValue(
                        "maxPriorityFeePerGas",
                        formatUnits(maxPriorityFeePerGas, "gwei")
                    )

                    setSuggestedAmount({
                        ...suggestedAmount,
                        maxPriorityFeePerGas,
                        maxFeePerGas,
                    })
                }

                setIsLoading(false)
            })
            .catch((e) => {
                log.error(e)

                history.push({
                    pathname: "/home",
                    state: {
                        error: "We couldn't find the transaction.",
                    },
                })
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transaction.id])

    const onSubmit = async (e: any) => {
        e.preventDefault()

        const data = getParsedValues()

        dispatch({
            type: "open",
            payload: { status: "loading" },
        })

        const isLinked = await checkDeviceIsLinked()
        if (!isLinked) {
            closeDialog()
            return
        }

        let gasValues: GasPriceValue | FeeMarketEIP1559Values

        if (transactionType !== TransactionType.FEE_MARKET_EIP1559) {
            gasValues = { gasPrice: data.gasPrice }
        } else {
            gasValues = {
                maxFeePerGas: data.maxFeePerGas,
                maxPriorityFeePerGas: data.maxPriorityFeePerGas,
            }
        }

        submitAction(transaction.id, data.gasLimit, gasValues).catch(
            (e: any) => {
                const isFeeLow = e.message.includes("replacement fee too low")
                const notEnoughFunds = e.message.includes("insufficient funds")

                setError({
                    type: isFeeLow
                        ? "feeLow"
                        : notEnoughFunds
                        ? "notEnoughFunds"
                        : "mined",
                    message: isFeeLow
                        ? "The network rejected the transaction because fees are too low."
                        : notEnoughFunds
                        ? `You don't have enough funds to ${type} the transaction.`
                        : `The transaction that you are trying to ${type} has already been mined.`,
                })
            }
        )
    }

    const transfer = transaction.transferType ?? {
        amount: transaction.transactionParams.value ?? BigNumber.from("0"),
        currency: networkNativeCurrency.symbol,
        decimals: networkNativeCurrency.decimals,
        logo: iconUrls ? iconUrls[0] : eth,
    }

    const validateFees = (fees: TransactionFeeData) => {
        const { maxFeePerGas, maxPriorityFeePerGas, gasPrice, gasLimit } = fees

        const newCustomErrors = { ...customErrors }
        const newWarning = { ...warning }

        newWarning.gasLimit = gasLimit!.lt(oldGasLimit!)
            ? `Gas limit lower than the old one of ${formatUnits(
                  oldGasLimit,
                  "wei"
              )} WEI`
            : ""

        if (transactionType !== TransactionType.FEE_MARKET_EIP1559) {
            newCustomErrors.gasPrice = gasPrice!.lte(oldGasPrice!)
                ? "Must be higher than the old gas price"
                : ""

            newWarning.gasPrice = gasPrice!.lt(suggestedAmount.gasPrice)
                ? `Gas price is lower than suggested price of ${formatUnits(
                      suggestedAmount.gasPrice,
                      "gwei"
                  )} GWEI`
                : gasLowerCap &&
                  gasLowerCap.gasPrice &&
                  gasPrice!.lt(gasLowerCap.gasPrice)
                ? "Gas price is lower than network limit"
                : ""
        } else {
            const baseFee = BigNumber.from(baseFeePerGas)

            newCustomErrors.maxPriorityFeePerGas = maxPriorityFeePerGas!.lte(
                oldMaxPriorityFeePerGas!
            )
                ? "Must be higher than the old max tip"
                : ""

            newWarning.maxPriorityFeePerGas = maxPriorityFeePerGas!.lt(
                suggestedAmount.maxPriorityFeePerGas
            )
                ? `Lower than suggested tip of ${formatUnits(
                      suggestedAmount.maxPriorityFeePerGas,
                      "gwei"
                  )} GWEI`
                : gasLowerCap &&
                  gasLowerCap.maxPriorityFeePerGas &&
                  maxPriorityFeePerGas!.lt(gasLowerCap.maxPriorityFeePerGas)
                ? "Tip lower than network limit"
                : ""

            newCustomErrors.maxFeePerGas = (() => {
                if (maxFeePerGas!.lte(oldMaxFeePerGas!))
                    return "Must be higher than the old max price"
                else if (maxFeePerGas!.lt(maxPriorityFeePerGas!))
                    return "Must be higher than the max tip"
                else return ""
            })()

            newWarning.maxFeePerGas = (() => {
                if (
                    gasLowerCap &&
                    gasLowerCap.maxPriorityFeePerGas &&
                    maxFeePerGas!.lt(gasLowerCap.maxPriorityFeePerGas)
                )
                    return "Max fee lower than network limit"
                else if (maxFeePerGas!.lt(baseFee.add(maxPriorityFeePerGas!)))
                    return "Max fee lower than base fee + tip"
                else if (maxFeePerGas!.lt(suggestedAmount.maxFeePerGas))
                    return `Lower than suggested max fee of ${formatUnits(
                        suggestedAmount.maxFeePerGas,
                        "gwei"
                    )} GWEI`
                else return ""
            })()
        }

        setWarning(newWarning)
        setCustomErrors(newCustomErrors)
    }

    const getParsedValues = () => {
        const values = getValues()

        return {
            gasLimit: parseUnits(values.gasLimit || "0", "wei"),
            gasPrice: parseUnits(values.gasPrice || "0", "gwei"),
            maxPriorityFeePerGas: parseUnits(
                values.maxPriorityFeePerGas || "0",
                "gwei"
            ),
            maxFeePerGas: parseUnits(values.maxFeePerGas || "0", "gwei"),
        }
    }

    const notEnoughFunds = currentBalance
        .sub(BigNumber.from(transaction.transactionParams.value ?? "0"))
        .sub(
            calcGasPrice(transactionType, {
                gasLimit: oldGasLimit,
                gasPrice: oldGasPrice,
                maxFeePerGas: oldMaxFeePerGas,
            })
        )
        .lt(
            calcGasPrice(transactionType, {
                gasLimit: parseUnits(newFees.gasLimit || "0", "wei"),
                gasPrice: parseUnits(newFees.gasPrice || "0", "gwei"),
                maxFeePerGas: parseUnits(newFees.maxFeePerGas || "0", "gwei"),
            })
        )

    useEffect(() => {
        if (!notEnoughFunds && error?.type !== "notEnoughFunds") return

        if (!notEnoughFunds && error?.type === "notEnoughFunds")
            setError(undefined)
        else if (notEnoughFunds && error?.type !== "notEnoughFunds")
            setError({
                type: "notEnoughFunds",
                message: `Not enough funds to ${type} the transaction`,
            })
    }, [error, notEnoughFunds, type])

    const { ref: gasLimitRef } = register("gasLimit")
    const { ref: gasPriceRef } = register("gasPrice")
    const { ref: maxPriorityFeePerGasRef } = register("maxPriorityFeePerGas")
    const { ref: maxFeePerGasRef } = register("maxFeePerGas")

    return (
        <>
            <DetailsDialog
                open={hasDialog}
                title="Transaction details"
                onClose={() => setHasDialog(false)}
                options={[
                    {
                        title: "To",
                        content: transaction.transactionParams.to!,
                        expandable: true,
                    },
                    {
                        title: "Value",
                        content: formatTransactionValue(transfer, true, 5).join(
                            " "
                        ),
                    },
                    {
                        title: "Original gas limit",
                        content: oldGasLimit.gt(0)
                            ? `${formatUnits(oldGasLimit, "wei")}`
                            : undefined,
                    },

                    {
                        title: "Original gas price",
                        content:
                            transactionType !==
                            TransactionType.FEE_MARKET_EIP1559
                                ? `${formatUnits(oldGasPrice, "gwei")} GWEI`
                                : undefined,
                    },
                    {
                        title: "Original max tip (per gas unit)",
                        content:
                            transactionType ===
                            TransactionType.FEE_MARKET_EIP1559
                                ? `${formatUnits(
                                      oldMaxPriorityFeePerGas,
                                      "gwei"
                                  )} GWEI`
                                : undefined,
                    },
                    {
                        title: "Original max price (per gas unit)",
                        content:
                            transactionType ===
                            TransactionType.FEE_MARKET_EIP1559
                                ? `${formatUnits(oldMaxFeePerGas, "gwei")} GWEI`
                                : undefined,
                    },
                    {
                        title: "Data",
                        content: transaction.transactionParams.data!,
                        expandable: true,
                    },
                ]}
            />
            <HardwareDeviceNotLinkedDialog
                onDone={resetDeviceLinkStatus}
                isOpen={isDeviceUnlinked}
                address={address}
                vendor={getDeviceFromAccountType(accountType)}
            />
            <WaitingDialog
                open={isOpen}
                status={status}
                titles={{
                    loading:
                        titles?.loading ||
                        (type === "cancel"
                            ? "Cancelling..."
                            : "Speeding up..."),
                    success: "Success",
                    error: "Error",
                }}
                texts={{
                    loading:
                        texts?.loading ||
                        (type === "cancel"
                            ? "Initiating the cancellation"
                            : "Initiating the speed up"),
                    success: `You've initiated the ${
                        type === "cancel" ? "cancellation" : "speed up"
                    }.`,
                    error: texts?.error ?? "",
                }}
                gifs={gifs}
                timeout={1500}
                clickOutsideToClose={false}
                txHash={replacementTx?.transactionParams.hash}
                onDone={() => {
                    if (status === "error" && error?.type === "mined") {
                        closeDialog()
                        return history.push({
                            pathname: "/home",
                        })
                    } else if (status === "error" && error?.type === "feeLow") {
                        setCurrentReplacementTxId(undefined)
                        return closeDialog()
                    } else if (status === "success") {
                        closeDialog()
                        return history.push({
                            pathname: "/home",
                        })
                    }
                }}
                showCloseButton
            />
            <div className="w-full h-full">
                <PopupLayout
                    header={
                        <PopupHeader
                            title={title}
                            onClose={(e) => {
                                e.preventDefault()

                                history.push("/")
                            }}
                            onBack={(e) => {
                                e.preventDefault()

                                history.push("/")
                            }}
                        />
                    }
                    footer={
                        <PopupFooter>
                            <ButtonWithLoading
                                label="Submit"
                                onClick={onSubmit}
                                isLoading={isLoading}
                                disabled={
                                    Object.values(customErrors).filter(
                                        (v) => v !== ""
                                    ).length > 0 || notEnoughFunds
                                }
                            />
                        </PopupFooter>
                    }
                >
                    <div className="p-6 pt-3">
                        <div className="flex flex-col pt-2 space-y-2 mb-3">
                            {children(
                                transactionType,
                                {
                                    gasLimit: oldGasLimit,
                                    gasPrice: oldGasPrice,
                                    maxPriorityFeePerGas:
                                        oldMaxPriorityFeePerGas,
                                    maxFeePerGas: oldMaxFeePerGas,
                                },
                                {
                                    gasLimit: parseUnits(
                                        newFees.gasLimit || "0",
                                        "wei"
                                    ),
                                    gasPrice: parseUnits(
                                        newFees.gasPrice || "0",
                                        "gwei"
                                    ),
                                    maxPriorityFeePerGas: parseUnits(
                                        newFees.maxPriorityFeePerGas || "0",
                                        "gwei"
                                    ),
                                    maxFeePerGas: parseUnits(
                                        newFees.maxFeePerGas || "0",
                                        "gwei"
                                    ),
                                }
                            )}
                        </div>
                        <hr
                            className="border-0.5 border-primary-grey-hover"
                            style={{
                                width: "calc(100% + 3rem)",
                                marginLeft: "-1.5rem",
                            }}
                        />
                        <div className="flex flex-col mt-3">
                            <TextInput
                                label="Gas limit"
                                name="gasLimit"
                                appearance="border"
                                defaultValue={formatUnits(
                                    transaction.transactionParams.gasLimit ??
                                        BigNumber.from(0),
                                    "wei"
                                )}
                                onKeyDown={handleKeyDown}
                                onChange={handleChangeAmountWei((value) => {
                                    setValue("gasLimit", value, {
                                        shouldValidate: true,
                                    })

                                    setNewFees({
                                        ...newFees,
                                        gasLimit: value,
                                    })

                                    validateFees({
                                        ...getParsedValues(),
                                        gasLimit: parseUnits(
                                            value === "" ? "0" : value,
                                            "wei"
                                        ),
                                    })
                                })}
                                error={errors.gasLimit?.message || ""}
                                warning={warning.gasLimit}
                                ref={gasLimitRef}
                            />
                        </div>
                        <div
                            className={classnames(
                                "flex flex-col mt-3",
                                transactionType !==
                                    TransactionType.FEE_MARKET_EIP1559
                                    ? ""
                                    : "hidden"
                            )}
                        >
                            <TextInput
                                label="Gas price"
                                appearance="border"
                                name="gasPrice"
                                value={newFees.gasPrice}
                                error={
                                    errors.gasPrice?.message ||
                                    customErrors.gasPrice ||
                                    ""
                                }
                                warning={
                                    errors.gasPrice?.message ||
                                    customErrors.gasPrice
                                        ? ""
                                        : warning.gasPrice
                                }
                                onKeyDown={handleKeyDown}
                                onChange={handleChangeAmountGwei((value) => {
                                    setValue("gasPrice", value, {
                                        shouldValidate: true,
                                    })

                                    setNewFees({
                                        ...newFees,
                                        gasPrice: value,
                                    })

                                    validateFees({
                                        ...getParsedValues(),
                                        gasPrice: parseUnits(
                                            value === "" ? "0" : value,
                                            "gwei"
                                        ),
                                    })
                                })}
                                ref={gasPriceRef}
                                endLabel="GWEI"
                            />
                        </div>
                        <div
                            className={classnames(
                                "flex flex-col mt-3",
                                transactionType ===
                                    TransactionType.FEE_MARKET_EIP1559
                                    ? ""
                                    : "hidden"
                            )}
                        >
                            <TextInput
                                label="Max tip (per gas unit)"
                                appearance="border"
                                name="maxPriorityFeePerGas"
                                value={newFees.maxPriorityFeePerGas}
                                error={
                                    errors.maxPriorityFeePerGas?.message ||
                                    customErrors.maxPriorityFeePerGas ||
                                    ""
                                }
                                warning={
                                    errors.maxPriorityFeePerGas?.message ||
                                    customErrors.maxPriorityFeePerGas
                                        ? ""
                                        : warning.maxPriorityFeePerGas
                                }
                                ref={maxPriorityFeePerGasRef}
                                onKeyDown={handleKeyDown}
                                onChange={handleChangeAmountGwei((value) => {
                                    setValue("maxPriorityFeePerGas", value, {
                                        shouldValidate: true,
                                    })
                                    setNewFees({
                                        ...newFees,
                                        maxPriorityFeePerGas: value,
                                    })

                                    validateFees({
                                        ...getParsedValues(),
                                        maxPriorityFeePerGas: parseUnits(
                                            value === "" ? "0" : value,
                                            "gwei"
                                        ),
                                    })
                                })}
                                endLabel="GWEI"
                            />
                        </div>
                        <div
                            className={classnames(
                                "flex flex-col mt-3",
                                transactionType ===
                                    TransactionType.FEE_MARKET_EIP1559
                                    ? ""
                                    : "hidden"
                            )}
                        >
                            <TextInput
                                label="Max price (per gas unit)"
                                appearance="border"
                                name="maxFeePerGas"
                                value={newFees.maxFeePerGas}
                                error={
                                    errors.maxFeePerGas?.message ||
                                    customErrors.maxFeePerGas ||
                                    ""
                                }
                                warning={
                                    errors.maxFeePerGas?.message ||
                                    customErrors.maxFeePerGas
                                        ? ""
                                        : warning.maxFeePerGas
                                }
                                ref={maxFeePerGasRef}
                                onKeyDown={handleKeyDown}
                                onChange={handleChangeAmountGwei((value) => {
                                    setValue("maxFeePerGas", value, {
                                        shouldValidate: true,
                                    })
                                    setNewFees({
                                        ...newFees,
                                        maxFeePerGas: value,
                                    })

                                    validateFees({
                                        ...getParsedValues(),
                                        maxFeePerGas: parseUnits(
                                            value === "" ? "0" : value,
                                            "gwei"
                                        ),
                                    })
                                })}
                                endLabel="GWEI"
                            />
                        </div>

                        <div className="mt-2 flex justify-between">
                            <ClickableText
                                onClick={(e) => {
                                    e.preventDefault()
                                    setHasDialog(true)
                                }}
                            >
                                View all details
                            </ClickableText>
                            {baseFeePerGas && (
                                <span className="block text-primary-grey-dark text-xs mt-px">
                                    Last base fee:{" "}
                                    {formatUnits(baseFeePerGas, "gwei")} GWEI
                                </span>
                            )}
                        </div>

                        {error && error.type === "notEnoughFunds" && (
                            <span className="text-xs block text-ellipsis overflow-hidden text-red-500 mt-2">
                                {error.message}
                            </span>
                        )}
                    </div>
                </PopupLayout>
            </div>
        </>
    )
}

export default CancelAndSpeedUpComponent
