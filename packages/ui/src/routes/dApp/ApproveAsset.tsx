import * as yup from "yup"
import AccountIcon from "../../components/icons/AccountIcon"
import CheckBoxDialog from "../../components/dialog/CheckboxDialog"
import Divider from "../../components/Divider"
import ErrorMessage from "../../components/error/ErrorMessage"
import GasPriceComponent from "../../components/transactions/GasPriceComponent"
import LoadingOverlay from "../../components/loading/LoadingOverlay"
import MiniCheckmark from "../../components/icons/MiniCheckmark"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useState, useEffect, FunctionComponent, useCallback } from "react"
import Tooltip from "../../components/label/Tooltip"
import useNextRequestRoute from "../../context/hooks/useNextRequestRoute"
import {
    confirmTransaction,
    getTokenBalance,
    rejectTransaction,
    searchTokenInAssetsList,
    setUserSettings,
} from "../../context/commActions"
import { AdvancedSettings } from "../../components/transactions/AdvancedSettings"
import { AiFillInfoCircle } from "react-icons/ai"
import { BigNumber, ethers } from "ethers"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { Classes, classnames } from "../../styles/classes"
import { GasPriceSelector } from "../../components/transactions/GasPriceSelector"
import { InferType } from "yup"
import { Redirect } from "react-router-dom"
import {
    TransactionAdvancedData,
    TransactionMeta,
} from "@block-wallet/background/controllers/transactions/utils/types"
import {
    HardwareWalletOpTypes,
    TransactionCategories,
} from "../../context/commTypes"
import { TransactionFeeData } from "@block-wallet/background/controllers/erc-20/transactions/SignedTransaction"
import { capitalize } from "../../util/capitalize"
import { formatHash, formatName } from "../../util/formatAccount"
import { formatRounded } from "../../util/formatRounded"
import { formatUnits, getAddress, parseUnits } from "ethers/lib/utils"
import { getAccountColor } from "../../util/getAccountColor"
import { parseAllowance } from "../../util/approval"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useForm } from "react-hook-form"
import { useSelectedAccountBalance } from "../../context/hooks/useSelectedAccountBalance"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useTokensList } from "../../context/hooks/useTokensList"
import { useUserSettings } from "../../context/hooks/useUserSettings"
import { yupResolver } from "@hookform/resolvers/yup"
import { useNonSubmittedExternalTransaction } from "../../context/hooks/useNonSubmittedExternalTransaction"
import useDebouncedState from "../../util/hooks/useDebouncedState"
import { useTransactionById } from "../../context/hooks/useTransactionById"
import WaitingDialog from "../../components/dialog/WaitingDialog"
import { getDeviceFromAccountType } from "../../util/hardwareDevice"
import { DAPP_FEEDBACK_WINDOW_TIMEOUT } from "../../util/constants"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import useCheckAccountDeviceLinked from "../../util/hooks/useCheckAccountDeviceLinked"
import { useTransactionWaitingDialog } from "../../context/hooks/useTransactionWaitingDialog"
import { canUserSubmitTransaction } from "../../util/transactionUtils"

const UNKNOWN_BALANCE = "UNKNOWN_BALANCE"
const UNLIMITED_ALLOWANCE = ethers.constants.MaxUint256

// Schema
const GetAllowanceYupSchema = (
    isCustomSelected: boolean,
    tokenDecimals: number
) => {
    return yup.object({
        customAllowance: yup.string().when([], {
            is: () => isCustomSelected,
            then: yup
                .string()
                .test(
                    "req",
                    "Please enter a custom limit",
                    (value?: string) => {
                        if (!value) return false
                        return true
                    }
                )
                .test(
                    "decimals",
                    "Custom limit has too many decimal numbers",
                    (value?: string) => {
                        if (!value) return false
                        if (!value.includes(".")) return true

                        const valueDecimals = value.split(".")[1].length

                        return valueDecimals <= tokenDecimals
                    }
                )
                .test(
                    "too-low",
                    "Custom limit is less than the minimum allowance",
                    (value?: string) => {
                        if (!value) return false
                        try {
                            const parsed = parseUnits(value, tokenDecimals)

                            return parsed.gte(BigNumber.from(0))
                        } catch (error) {
                            return false
                        }
                    }
                )
                .test(
                    "too-large",
                    "Custom limit is larger than the unlimited allowance",
                    (value?: string) => {
                        if (!value) return false
                        try {
                            const parsed = parseUnits(value, tokenDecimals)

                            return UNLIMITED_ALLOWANCE.gte(parsed)
                        } catch (error) {
                            return false
                        }
                    }
                ),
        }),
    })
}

export interface ApproveAssetProps {
    transactionId: string
    transactionCount: number
}

const ApproveAssetPage = () => {
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

    if (
        !currentTx ||
        currentTx.transactionCategory !==
            TransactionCategories.TOKEN_METHOD_APPROVE ||
        currentTx.advancedData?.tokenId
    ) {
        return <Redirect to={route} />
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
    const { accounts, selectedAddress, settings } = useBlankState()!
    const { chainId, isEIP1559Compatible, desc } = useSelectedNetwork()
    const { hideAddressWarning } = useUserSettings()
    const selectedAccountBalance = useSelectedAccountBalance()
    const { nativeToken } = useTokensList()

    const { isDeviceUnlinked, checkDeviceIsLinked, resetDeviceLinkStatus } =
        useCheckAccountDeviceLinked()

    // Get tx
    const { transaction: txById, params } = useTransactionById(transactionId)

    // At this point transactionId is ensured.
    const transaction = txById!

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
    const [isEditAllowancePage, setIsEditAllowancePage] = useState(false)
    const [isCustomSelected, setIsCustomSelected] = useState(false)
    const [customAllowance, setCustomAllowance] = useState("")
    const [isCustomAllowanceSaved, setIsCustomAllowanceSaved] = useState(false)
    const [accountWarningClosed, setAccountWarningClosed] = useState(false)
    const [assetBalance, setAssetBalance] = useState("0.0")
    const [isLoading, setIsLoading] = useState(transaction.loadingGasValues)
    const [isTokenLoading, setIsTokenLoading] = useState(true)
    const [isNameLoading, setIsNameLoading] = useState(true)

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

    const { status, isOpen, dispatch, texts, titles, closeDialog, gifs } =
        useTransactionWaitingDialog(
            transaction
                ? {
                      id: transactionId,
                      status: transaction.status,
                      error: transaction.error as Error,
                      epochTime: transaction?.approveTime,
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
                customAllowance: isCustomAllowanceSaved
                    ? parseAllowance(customAllowance, tokenDecimals)
                    : undefined,
                customNonce: transactionAdvancedData.customNonce,
            })
        } catch (error) {}
    }

    const reject = async () => {
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

    // Validator
    const schema = GetAllowanceYupSchema(isCustomSelected, tokenDecimals)
    type CustomAllowanceForm = InferType<typeof schema>

    const {
        register,
        handleSubmit,
        setValue,

        formState: { errors },
    } = useForm<CustomAllowanceForm>({
        resolver: yupResolver(schema),
    })

    const handleChangeAllowance = (event: any) => {
        let value = event.target.value

        value = value
            .replace(",", ".")
            .replace(/[^0-9.]/g, "")
            .replace(/(\..*?)\..*/g, "$1")

        if (!value || value === ".") {
            value = ""
        }

        setValue("customAllowance", value, {
            shouldValidate: true,
        })
    }

    const handleFocus = (event: any) => {
        if (isCustomAllowanceSaved) {
            setValue("customAllowance", customAllowance, {
                shouldValidate: true,
            })
        }
    }

    const onSubmit = handleSubmit(async (values: CustomAllowanceForm) => {
        if (isCustomSelected) {
            setCustomAllowance(values.customAllowance!)
        }
        setIsCustomAllowanceSaved(isCustomSelected)
        setIsEditAllowancePage(false)
    })

    const origin = (
        <span className="inline-block" title={transaction.origin}>
            {formatName(transaction.origin, 30)}
        </span>
    )

    const mainSection = (
        <>
            <div className="px-6 py-3">
                <p className="text-sm font-bold pb-3 break-word">
                    Allow {origin} to access your {tokenName}
                </p>
                <p className="text-sm text-gray-500 break-word">
                    By granting this permission, you are allowing {origin} to
                    withdraw your {tokenName} and automate transactions for you.
                </p>
            </div>
            <Divider />
            <div className="flex flex-col space-y-2 px-6 py-3">
                <label className="text-sm text-gray-600">Gas Price</label>
                {!isEIP1559Compatible ? (
                    <GasPriceSelector
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
                />
                <div className="flex flex-col items-end">
                    <span
                        className="text-xs font-bold text-primary-300 cursor-pointer hover:underline"
                        onClick={() => setIsEditAllowancePage(true)}
                    >
                        Set custom allowance
                    </span>
                </div>
                <div className="text-xs text-red-500">
                    {!hasBalance && "Insufficient funds."}
                </div>
            </div>
        </>
    )

    const editAllowanceSection = (
        <div className="flex flex-col space-y-3 px-6 pt-4">
            <p className="text-gray-500 text-sm pb-1">
                {`Allow ${transaction.origin} to withdraw and spend up to the following amount:`}
            </p>
            <div
                className="relative flex flex-col p-3 rounded-md border border-gray-200 cursor-pointer"
                onClick={() => {
                    setIsCustomSelected(false)
                }}
            >
                <div
                    className={classnames(
                        "absolute mr-6 right-0 top-6",
                        isCustomSelected ? "hidden" : "visible"
                    )}
                >
                    <MiniCheckmark fill="#1673FF" />
                </div>
                <p
                    className={classnames(
                        "text-sm font-bold",
                        !isCustomSelected && "text-primary-300"
                    )}
                >
                    {defaultAllowance === UNLIMITED_ALLOWANCE._hex
                        ? "Unlimited"
                        : "Requested"}
                </p>
                <p className="text-gray-500 text-xs pt-1 pb-2">
                    Spend limit requested
                </p>
                <p
                    className={classnames(
                        "text-sm",
                        isCustomSelected && "text-gray-400"
                    )}
                >{`${Number(
                    formatUnits(defaultAllowance, tokenDecimals)
                )} ${tokenName}`}</p>
            </div>
            <div
                className="relative flex flex-col p-3 rounded-md border border-gray-200 cursor-pointer"
                onClick={() => {
                    setIsCustomSelected(true)
                }}
            >
                <div
                    className={classnames(
                        "absolute mr-6 right-0 top-6",
                        isCustomSelected ? "visible" : "hidden"
                    )}
                >
                    <MiniCheckmark fill="#1673FF" />
                </div>
                <p
                    className={classnames(
                        "text-sm font-bold",
                        isCustomSelected && "text-primary-300"
                    )}
                >
                    Custom Limit
                </p>
                <p className="text-gray-500 text-xs pt-1 pb-2">
                    Enter custom max spend limit
                </p>
                <input
                    type="text"
                    {...register("customAllowance")}
                    className={classnames(
                        Classes.inputBordered,
                        !isCustomSelected && "text-gray-400",
                        errors.customAllowance &&
                            "border-red-400 focus:border-red-600"
                    )}
                    autoComplete="off"
                    onInput={handleChangeAllowance}
                    placeholder={
                        isCustomAllowanceSaved
                            ? customAllowance
                            : "Enter custom limit..."
                    }
                    onFocus={handleFocus}
                />
                <ErrorMessage>{errors.customAllowance?.message}</ErrorMessage>
            </div>
        </div>
    )

    return (
        <PopupLayout
            header={
                <PopupHeader
                    close={false}
                    title={isEditAllowancePage ? "Edit allowance" : "Approval"}
                    backButton={isEditAllowancePage}
                    onBack={() => setIsEditAllowancePage(false)}
                    networkIndicator
                >
                    {transactionCount > 1 && (
                        <div className="group relative">
                            <AiFillInfoCircle
                                size={26}
                                className="pl-2 text-primary-200 cursor-pointer hover:text-primary-300"
                            />
                            <Tooltip
                                content={`${transactionCount - 1} more ${
                                    transactionCount > 2
                                        ? "transactions"
                                        : "transaction"
                                }`}
                            />
                        </div>
                    )}
                </PopupHeader>
            }
            footer={
                <PopupFooter>
                    {isEditAllowancePage ? (
                        <ButtonWithLoading
                            label="Save"
                            type="submit"
                            onClick={onSubmit}
                        />
                    ) : (
                        <>
                            <ButtonWithLoading
                                buttonClass={Classes.liteButton}
                                label="Reject"
                                disabled={
                                    !canUserSubmitTransaction(
                                        transaction.status
                                    )
                                }
                                onClick={reject}
                            />
                            <ButtonWithLoading
                                label="Approve"
                                disabled={
                                    !hasBalance ||
                                    !canUserSubmitTransaction(
                                        transaction.status
                                    )
                                }
                                onClick={approve}
                            />
                        </>
                    )}
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
                    loading: texts?.loading || "Updating token allowance...",
                    success: texts?.success || "Updated token allowance.",
                    error: texts?.error || "Something went wrong",
                }}
                clickOutsideToClose={false}
                txHash={transaction.transactionParams.hash}
                timeout={DAPP_FEEDBACK_WINDOW_TIMEOUT}
                onDone={closeDialog}
                gifs={gifs}
                hideButton
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
                    <span className="text-sm font-bold">
                        {formatName(account.name, 15)}
                    </span>
                    <span
                        className="text-xs text-gray-600 truncate"
                        title={account.address}
                    >
                        {formatHash(account.address)}
                    </span>
                </div>
                <div className="ml-auto flex flex-col items-end space-x-1">
                    <div className="flex flex-row items-center">
                        <span className="text-xs text-gray-600 truncate">
                            {`${formatName(assetBalance, 18)}`}
                        </span>
                        <img
                            src={tokenLogo}
                            alt={tokenName}
                            width="14px"
                            draggable={false}
                            className="ml-1"
                        />
                    </div>
                    <div className="flex flex-row items-center mt-1">
                        <span className="text-xs text-gray-600 truncate">
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
                            src={nativeToken.token.logo}
                            alt={nativeToken.token.symbol}
                            width="14px"
                            draggable={false}
                            className="ml-1"
                        />
                    </div>
                </div>
            </div>
            <Divider />
            {isEditAllowancePage ? editAllowanceSection : mainSection}
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
