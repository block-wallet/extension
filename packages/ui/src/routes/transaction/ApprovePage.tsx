import * as yup from "yup"
import AccountIcon from "../../components/icons/AccountIcon"
import Divider from "../../components/Divider"
import ErrorMessage from "../../components/error/ErrorMessage"
import GasPriceComponent from "../../components/transactions/GasPriceComponent"
import MiniCheckmark from "../../components/icons/MiniCheckmark"
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
    blankDepositAllowance,
    getApproveTransactionGasLimit,
    getLatestGasPrice,
} from "../../context/commActions"
import WaitingDialog from "../../components/dialog/WaitingDialog"
import { useTokensList } from "../../context/hooks/useTokensList"
import { APPROVE_GAS_COST } from "../../util/constants"
import { AdvancedSettings } from "../../components/transactions/AdvancedSettings"
import { BigNumber, ethers } from "ethers"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { Classes, classnames } from "../../styles/classes"
import { GasPriceSelector } from "../../components/transactions/GasPriceSelector"
import { InferType } from "yup"
import { capitalize } from "../../util/capitalize"
import { formatName } from "../../util/formatAccount"
import { formatRounded } from "../../util/formatRounded"
import { formatUnits, parseUnits } from "ethers/lib/utils"
import { getAccountColor } from "../../util/getAccountColor"
import { useForm } from "react-hook-form"
import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { yupResolver } from "@hookform/resolvers/yup"
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
import { DepositConfirmLocalState } from "../deposit/DepositConfirmPage"
import { SwapConfirmPageLocalState } from "../swap/SwapConfirmPage"
import { ExchangeType } from "../../context/commTypes"
import { TransactionAdvancedData } from "@block-wallet/background/controllers/transactions/utils/types"
import { BridgeConfirmPageLocalState } from "../bridge/BridgeConfirmPage"

const UNLIMITED_ALLOWANCE = ethers.constants.MaxUint256

export enum ApproveOperation {
    BRIDGE,
    DEPOSIT,
    SWAP,
}

const getLabels = (
    operation: ApproveOperation,
    assetName: string
): Record<
    "mainSectionTitle" | "mainSectionText" | "editAllowanceText",
    string
> => {
    if (operation === ApproveOperation.BRIDGE) {
        return {
            mainSectionTitle: `Approve BlockWallet to bridge your ${assetName}`,
            mainSectionText: `Allow BlockWallet Bridge to withdraw your ${assetName} and automate transactions for you.`,
            editAllowanceText: `Allow the BlockWallet Bridge to the following amount of ${assetName}:`,
        }
    } else if (operation === ApproveOperation.DEPOSIT) {
        return {
            mainSectionTitle: "Allow the Privacy Pool to:",
            mainSectionText: `Transfer ${assetName} from your account to the Privacy Pool to make the deposit.`,
            editAllowanceText: `Allow the Privacy Pool to deposit up to the following amount of ${assetName}:`,
        }
    } else {
        return {
            mainSectionTitle: `Approve BlockWallet to swap your ${assetName}`,
            mainSectionText: `Allow BlockWallet Swaps to withdraw your ${assetName} and automate transactions for you.`,
            editAllowanceText: `Allow BlockWallet Swaps to swap up to the following amount of ${assetName}:`,
        }
    }
}

interface ApprovePageState {
    assetAllowance: BigNumber
    isCustomSelected: boolean
    isCustomAllowanceSaved: boolean
    submitted: boolean
}

const INITIAL_VALUE_PERSISTED_DATA = {
    assetAllowance: UNLIMITED_ALLOWANCE,
    isCustomSelected: false,
    isCustomAllowanceSaved: false,
    submitted: false,
}

// Schema
const GetAllowanceYupSchema = (
    isCustomSelected: boolean,
    tokenDecimals: number,
    minAllowance: BigNumber
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
                    "Custom limit is less than the minimum required",
                    (value?: string) => {
                        if (!value) return false
                        try {
                            const parsed = parseUnits(value, tokenDecimals)

                            return minAllowance.lte(parsed)
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

export interface ApprovePageLocalState {
    assetAddress: string
    minAllowance?: BigNumber
    approveOperation: ApproveOperation
    nextLocationState:
        | BridgeConfirmPageLocalState
        | DepositConfirmLocalState
        | SwapConfirmPageLocalState
}

const ApprovePage: FunctionComponent<{}> = () => {
    // History
    const { clear: clearLocationRecovery } = useLocationRecovery()
    const history: any = useOnMountHistory()
    const {
        assetAddress,
        minAllowance,
        approveOperation = ApproveOperation.DEPOSIT,
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
    const { chainId, isEIP1559Compatible, name } = useSelectedNetwork()
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

    // Local state
    const setIsCustomSelected = (isCustomSelected: boolean) => {
        setPersistedData((prev: ApprovePageState) => {
            return {
                ...prev,
                isCustomSelected,
            }
        })
    }

    const { isCustomSelected, assetAllowance, isCustomAllowanceSaved } =
        persistedData || INITIAL_VALUE_PERSISTED_DATA

    const [isEditAllowanceSection, setIsEditAllowanceSection] =
        useState<boolean>(false)
    const [isGasUpdating, setIsGasUpdating] = useState<boolean>(false)
    const [hasBalance, setHasBalance] = useState<boolean>(false)
    const [customNonce, setCustomNonce] = useState<number | undefined>()

    // Set data
    const networkName = capitalize(name)
    const isApproving = status === "loading" && isOpen
    const minimumAllowance = BigNumber.from(minAllowance || 0)
    const hasMinAllowance = minimumAllowance.gt(BigNumber.from(0))
    const labels = getLabels(
        approveOperation,
        selectedAccount.balances[chainId].tokens[assetAddress].token.symbol
    )

    // Get asset object
    const localAsset = selectedAccount.balances[chainId].tokens[assetAddress]
    const assetBalance = localAsset.balance
    const assetName = localAsset.token.symbol
    const assetDecimals = localAsset.token.decimals

    // Validation
    const schema = GetAllowanceYupSchema(
        isCustomSelected,
        assetDecimals,
        minimumAllowance
    )
    type CustomAllowanceForm = InferType<typeof schema>

    const {
        register,
        handleSubmit,
        setValue,

        formState: { errors },
    } = useForm<CustomAllowanceForm>({
        resolver: yupResolver(schema),
    })

    const shouldShowError = errors.customAllowance && isCustomSelected

    // Set field value on section update
    useEffect(() => {
        if (!isEditAllowanceSection) {
            return
        }

        let defaultAllowance: BigNumber | null = null

        if (isCustomSelected && isCustomAllowanceSaved) {
            defaultAllowance = BigNumber.from(assetAllowance)
        } else if (hasMinAllowance) {
            defaultAllowance = minimumAllowance
        }

        if (defaultAllowance) {
            const parsedAllowance = formatUnits(defaultAllowance, assetDecimals)

            setValue("customAllowance", parsedAllowance, {
                shouldValidate: true,
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditAllowanceSection])

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
                                approveOperation === ApproveOperation.DEPOSIT
                                    ? "deposit"
                                    : selectedAccount.address
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

    // Form submit
    const saveAllowance = handleSubmit(async (values: CustomAllowanceForm) => {
        if (!isCustomSelected) {
            setPersistedData((prev: ApprovePageState) => ({
                ...prev,
                assetAllowance: UNLIMITED_ALLOWANCE,
                isCustomAllowanceSaved: false,
            }))
        } else if (values.customAllowance) {
            setPersistedData((prev: ApprovePageState) => ({
                ...prev,
                assetAllowance: parseUnits(
                    values.customAllowance || "",
                    assetDecimals
                ),
                isCustomAllowanceSaved: true,
            }))
        }

        setIsEditAllowanceSection(false)
    })

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
            let res: boolean = false

            if (approveOperation === ApproveOperation.SWAP) {
                const nextState = nextLocationState as SwapConfirmPageLocalState

                res = await approveExchange(
                    assetAllowance,
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
            } else if (approveOperation === ApproveOperation.DEPOSIT) {
                const nextState = nextLocationState as DepositConfirmLocalState

                res = await blankDepositAllowance(
                    assetAllowance,
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
                    {
                        currency: nextState.selectedCurrency,
                        amount: nextState.amount as any,
                    },
                    customNonce
                )
            } else {
                const nextState =
                    nextLocationState as BridgeConfirmPageLocalState

                res = await approveBridgeAllowance(
                    assetAllowance,
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

            if (res) {
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
            state: nextLocationState,
        })
    }

    const onBack = () => {
        if (isEditAllowanceSection) {
            return () => {
                setIsEditAllowanceSection(false)
                setIsCustomSelected(isCustomAllowanceSaved ? true : false)
            }
        }

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

    const mainSection = (
        <>
            <div className="flex flex-col space-y-3 px-6 py-4">
                <p className="text-sm font-bold">{labels.mainSectionTitle}</p>
                <p className="text-sm text-gray-500">
                    {labels.mainSectionText}
                </p>
            </div>
            <Divider />
            <div className="flex flex-col space-y-3 px-6 pt-4">
                <label className="text-sm text-gray-600">Gas Price</label>
                {!isEIP1559Compatible ? (
                    <GasPriceSelector
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
                />
                <div
                    className="text-xs font-bold text-primary-300 cursor-pointer hover:underline"
                    onClick={() => setIsEditAllowanceSection(true)}
                >
                    Set custom allowance
                </div>
                <ErrorMessage
                    error={
                        // texts?.error ||
                        hasBalance ? undefined : "Insufficient funds"
                    }
                />
            </div>
        </>
    )

    const editAllowanceSection = (
        <div className="flex flex-col space-y-3 px-6 pt-4">
            <p className="text-gray-500 text-sm pb-1">
                {labels.editAllowanceText}
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
                    Unlimited
                </p>
                <p className="text-gray-500 text-xs pt-1 pb-2">
                    Grant unlimited allowance
                </p>
                <p
                    className={classnames(
                        "text-sm",
                        isCustomSelected && "text-gray-400"
                    )}
                >{`${Number(
                    formatUnits(UNLIMITED_ALLOWANCE, assetDecimals)
                )} ${assetName}`}</p>
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
                    Set a custom spend limit
                </p>
                <input
                    type="text"
                    {...register("customAllowance")}
                    className={classnames(
                        Classes.inputBordered,
                        !isCustomSelected && "text-gray-400",
                        shouldShowError && "border-red-400 focus:border-red-600"
                    )}
                    autoComplete="off"
                    onInput={handleChangeAllowance}
                    placeholder="Enter custom allowance"
                />
                <ErrorMessage error={errors.customAllowance?.message} />
            </div>
        </div>
    )

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title={
                        isEditAllowanceSection
                            ? "Custom Allowance"
                            : "Allowance"
                    }
                    disabled={isApproving}
                    onBack={onBack()}
                    keepState
                />
            }
            footer={
                <PopupFooter>
                    {isEditAllowanceSection ? (
                        <ButtonWithLoading
                            label="Save"
                            type="submit"
                            onClick={saveAllowance}
                        />
                    ) : (
                        <ButtonWithLoading
                            label="Approve"
                            isLoading={isApproving}
                            disabled={!hasBalance || isGasUpdating}
                            onClick={onSubmit}
                        />
                    )}
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
                            formatUnits(assetBalance || "0", assetDecimals)
                        )}
                        {` ${assetName}`}
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
                <div className="flex flex-row items-center ml-auto p-1 px-2 pr-1 text-gray-600 rounded-md border border-primary-200 text-xs bg-green-100">
                    <span className="inline-flex rounded-full h-2 w-2 mr-2 animate-pulse bg-green-400 pointer-events-none" />
                    <span className="mr-1 pointer-events-none text-green-600">
                        {networkName}
                    </span>
                </div>
            </div>
            <Divider />
            {isEditAllowanceSection ? editAllowanceSection : mainSection}
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
