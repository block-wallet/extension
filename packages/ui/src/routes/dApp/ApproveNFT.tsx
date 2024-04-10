import AccountIcon from "../../components/icons/AccountIcon"
import CheckBoxDialog from "../../components/dialog/CheckboxDialog"
import Divider from "../../components/Divider"
import GasPriceComponent from "../../components/transactions/GasPriceComponent"
import LoadingOverlay from "../../components/loading/LoadingOverlay"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useState, useEffect, FunctionComponent, useCallback } from "react"
import Tooltip from "../../components/label/Tooltip"
import useNextRequestRoute from "../../context/hooks/useNextRequestRoute"
import {
    confirmTransaction,
    rejectTransaction,
    searchTokenInAssetsList,
    setUserSettings,
} from "../../context/commActions"
import { AdvancedSettings } from "../../components/transactions/AdvancedSettings"
import { AiFillInfoCircle } from "react-icons/ai"
import { BigNumber } from "@ethersproject/bignumber"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { Classes } from "../../styles/classes"
import { GasPriceSelector } from "../../components/transactions/GasPriceSelector"
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
import { formatHashFirstLastChars, formatName } from "../../util/formatAccount"
import { formatRounded } from "../../util/formatRounded"
import { formatUnits } from "@ethersproject/units"
import { getAddress } from "@ethersproject/address"
import { getAccountColor } from "../../util/getAccountColor"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useSelectedAccountBalance } from "../../context/hooks/useSelectedAccountBalance"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useTokensList } from "../../context/hooks/useTokensList"
import { useUserSettings } from "../../context/hooks/useUserSettings"
import { useNonSubmittedExternalTransaction } from "../../context/hooks/useNonSubmittedExternalTransaction"
import useDebouncedState from "../../util/hooks/useDebouncedState"
import { useTransactionById } from "../../context/hooks/useTransactionById"
import { useTransactionWaitingDialog } from "../../context/hooks/useTransactionWaitingDialog"
import { canUserSubmitTransaction } from "../../util/transactionUtils"
import { DAPP_FEEDBACK_WINDOW_TIMEOUT } from "../../util/constants"
import WaitingDialog from "../../components/dialog/WaitingDialog"
import useCheckAccountDeviceLinked from "../../util/hooks/useCheckAccountDeviceLinked"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import { getDeviceFromAccountType } from "../../util/hardwareDevice"
import { generateExplorerLink } from "../../util/getExplorer"

export interface ApproveNFTProps {
    transactionId: string
    transactionCount: number
}

const ApproveNFTPage = () => {
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
        !currentTx.advancedData?.tokenId
    ) {
        return <Redirect to={route} />
    } else {
        return (
            <ApproveNFT
                transactionId={currentTx.id}
                transactionCount={transactionCount}
            />
        )
    }
}

const ApproveNFT: FunctionComponent<ApproveNFTProps> = ({
    transactionCount,
    transactionId,
}) => {
    // Hooks
    const {
        accounts,
        selectedAddress,
        settings,
        defaultGasOption,
        availableNetworks,
        selectedNetwork,
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
    const [isNFTSection, setIsNFTSection] = useState(false)
    const [accountWarningClosed, setAccountWarningClosed] = useState(false)
    const [isLoading, setIsLoading] = useState(transaction.loadingGasValues)
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
    const spenderAddress = transaction.approveAllowanceParams?.spenderAddress!
    const spenderName =
        transaction.approveAllowanceParams?.spenderInfo?.name ??
        `Spender ${formatHashFirstLastChars(
            transaction.approveAllowanceParams?.spenderAddress!
        )}`

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

    useEffect(
        () => {
            searchTokenInAssetsList(tokenAddress)
                .then((searchTokensResponse) => {
                    setTokenName(searchTokensResponse.tokens[0].symbol)
                })
                .catch(() => {
                    throw new Error("Failed to fetch token data")
                })
                .finally(() => {
                    setIsNameLoading(false)
                })
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    const approve = async () => {
        try {
            dispatch({ type: "open", payload: { status: "loading" } })

            const isLinked = await checkDeviceIsLinked()
            if (!isLinked) {
                closeDialog()
                return
            }

            await confirmTransaction(transaction.id, transactionGas, {
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

    const origin = (
        <span className="inline-block" title={transaction.origin}>
            {formatName(transaction.origin, 60)}
        </span>
    )

    const spenderAddressExplorerLink = generateExplorerLink(
        availableNetworks,
        selectedNetwork,
        spenderAddress,
        "address"
    )

    const mainSectionText = (
        <>
            This will let{" "}
            <a
                href={spenderAddressExplorerLink}
                target="_blank"
                rel="noreferrer"
                className="text-primary-300 hover:underline"
            >
                {spenderName}
            </a>{" "}
            withdraw and automate {tokenName} transactions for you.
        </>
    )

    return (
        <PopupLayout
            header={
                <PopupHeader
                    close={false}
                    title="NFT Approval"
                    backButton={isNFTSection}
                    onBack={() => setIsNFTSection(false)}
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
                            />
                        </div>
                    )}
                </PopupHeader>
            }
            footer={
                <PopupFooter>
                    {isNFTSection ? null : (
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
                    loading: texts?.loading || "Approving NFT...",
                    success: texts?.success || "Approved NFT.",
                    error: texts?.error || "Something went wrong",
                }}
                clickOutsideToClose={false}
                txHash={transaction.transactionParams.hash}
                timeout={DAPP_FEEDBACK_WINDOW_TIMEOUT}
                onDone={closeDialog}
                gifs={gifs}
                hideButton
                showCloseButton
            />
            {isNameLoading && <LoadingOverlay />}
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
                    <span className="text-xs text-primary-grey-dark">
                        {formatRounded(
                            formatUnits(
                                balance || "0",
                                nativeToken.token.decimals
                            )
                        )}
                        {` ${nativeToken.token.symbol}`}
                    </span>
                </div>
            </div>
            <Divider />
            <div className="px-6 py-3">
                <p className="text-sm font-semibold pb-3 break-word">
                    {origin} is requesting to update your {tokenName} allowance
                </p>
                <p className="text-sm text-primary-grey-dark break-word">
                    {mainSectionText}
                </p>
            </div>
            <Divider />
            <div className="flex flex-col space-y-2 px-6 py-3">
                <label className="text-[13px] font-medium text-primary-grey-dark">
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
                <div className="text-xs text-red-500 !mt-0">
                    {!hasBalance && "Insufficient funds."}
                </div>
            </div>
            <HardwareDeviceNotLinkedDialog
                isOpen={isDeviceUnlinked}
                onDone={resetDeviceLinkStatus}
                vendor={getDeviceFromAccountType(account.accountType)}
                address={account.address}
            />
        </PopupLayout>
    )
}

export default ApproveNFTPage
