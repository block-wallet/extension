import { CSSProperties } from "react"
import { FaExchangeAlt } from "react-icons/fa"
import { FiUpload } from "react-icons/fi"
import { RiCopperCoinFill } from "react-icons/ri"
import { AiFillInfoCircle } from "react-icons/ai"
import { GiSuspensionBridge } from "react-icons/gi"
import { ImSpinner } from "react-icons/im"
import { BigNumber } from "@ethersproject/bignumber"
import classNames from "classnames"
import { Classes, classnames } from "../../styles"
import Tooltip from "../../components/label/Tooltip"
import eth from "../../assets/images/icons/ETH.svg"
import blankLogo from "../../assets/images/logo.svg"
import unknownTokenIcon from "../../assets/images/unknown_token.svg"

import flashbotsLogo from "../../assets/images/flashbots.png"
import {
    BridgeSubstatus,
    MetaType,
    TransactionCategories,
    TransactionStatus,
} from "../../context/commTypes"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import {
    BridgeTransactionParams,
    TransactionMeta,
    TransferType,
} from "@block-wallet/background/controllers/transactions/utils/types"
import { capitalize } from "../../util/capitalize"
import { getDisplayTime } from "../../util/getDisplayTime"
import formatTransactionValue from "../../util/formatTransactionValue"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import AppIcon from "./../icons/AppIcon"
import { formatName } from "../../util/formatAccount"
import { RichedTransactionMeta } from "../../util/transactionUtils"
import Dots from "../loading/LoadingDots"
import useCurrencyFromatter from "../../util/hooks/useCurrencyFormatter"
import useGetBridgeTransactionsData from "../../util/hooks/useGetBridgeTransactionsData"
import {
    BRIDGE_PENDING_STATUS,
    getBridgePendingMessage,
} from "../../util/bridgeUtils"
import { formatUnits } from "ethers/lib/utils"
import TokenLogo from "../token/TokenLogo"

const TRANSACTION_STATIC_MESSAGES = {
    [TransactionCategories.BLANK_DEPOSIT]: "Privacy Pool Deposit",
    [TransactionCategories.BLANK_WITHDRAWAL]: "Privacy Pool Withdraw",
    [TransactionCategories.INCOMING]: "Received Ether",
    [TransactionCategories.SENT_ETHER]: "Sent Ether",
    [TransactionCategories.CONTRACT_DEPLOYMENT]: "Deploy Contract",
    [TransactionCategories.CONTRACT_INTERACTION]: "Contract Interaction",
    [TransactionCategories.TOKEN_METHOD_TRANSFER]: "Token Transfer",
    [TransactionCategories.TOKEN_METHOD_INCOMING_TRANSFER]: "Received Token",
    [TransactionCategories.TOKEN_METHOD_TRANSFER_FROM]: "Token Transfer From",
    [TransactionCategories.EXCHANGE]: "BlockWallet Swap",
    [TransactionCategories.BRIDGE]: "BlockWallet Bridge",
    [TransactionCategories.INCOMING_BRIDGE]: "Incoming Bridge",
    [TransactionCategories.INCOMING_BRIDGE_REFUND]: "Bridge Refund",
    [TransactionCategories.INCOMING_BRIDGE_PLACEHOLDER]: "Incoming Bridge",
}

const PENDING_TRANSACTION_STATIC_MESSAGES: { [x: string]: string } = {
    [TransactionCategories.CONTRACT_DEPLOYMENT]: "Deploying Contract",
    [TransactionCategories.TOKEN_METHOD_TRANSFER]: "Transferring Tokens",
}

const getTransactionMessage = (
    category: TransactionCategories,
    symbol: string,
    advancedData: TransactionMeta["advancedData"]
) => {
    const message = (() => {
        switch (category) {
            case TransactionCategories.SENT_ETHER:
                return `Sent ${symbol}`
            case TransactionCategories.INCOMING:
                return `Received ${symbol}`
            case TransactionCategories.TOKEN_METHOD_APPROVE:
                if (
                    advancedData?.allowance &&
                    BigNumber.from(advancedData.allowance).eq(0)
                ) {
                    return `Allowance Revoke`
                }
                return `Allowance Approval`
            default:
                return TRANSACTION_STATIC_MESSAGES[category]
        }
    })()

    return message
}

const getPendingTransactionMessage = (
    category: TransactionCategories,
    metaType: MetaType,
    symbol: string,
    advancedData: TransactionMeta["advancedData"]
) => {
    const message = (() => {
        switch (category) {
            case TransactionCategories.SENT_ETHER:
                return `Sending ${symbol}`
            case TransactionCategories.TOKEN_METHOD_APPROVE:
                if (
                    advancedData?.allowance &&
                    BigNumber.from(advancedData.allowance).eq(0)
                ) {
                    return `Revoking Allowance`
                }
                return `Approving Allowance`
            default:
                return PENDING_TRANSACTION_STATIC_MESSAGES[category]
        }
    })()

    if (metaType === MetaType.CANCEL || metaType === MetaType.SPEED_UP)
        return `${
            metaType === MetaType.CANCEL ? "Cancelation" : "Speeding up"
        } of ${message[0].toLowerCase()}${message.substring(1)}`

    return message
}

const getTransactionItemStyles = (
    label: string = "Transaction",
    txValue: string
) => {
    let formattedLabel = label

    // We're letting both containers to grow based on content but with a limit to keep them inside the container
    let typeCss: CSSProperties = { maxWidth: "170px" }
    let amountCss: CSSProperties = { maxWidth: "118px" }

    // If label and value are both long, we crop the label prioritizing the value.
    //Example: Privacy Pool Witdraw X.XXXXX
    if (label.length > 18 && txValue?.length > 7) {
        formattedLabel = formatName(label, 20)
    }

    // If label is not that long, we give value more space.
    if (label.length < 16) {
        amountCss.maxWidth = "140px"
    }

    return { formattedLabel, typeCss, amountCss }
}

const transactionIcons: Record<TransactionCategories, any> = {
    [TransactionCategories.BLANK_DEPOSIT]: <img src={blankLogo} alt="blank" />,
    [TransactionCategories.BLANK_WITHDRAWAL]: (
        <img src={blankLogo} alt="BlockWallet" />
    ),
    [TransactionCategories.INCOMING]: <img src={eth} alt="ETH" />,
    [TransactionCategories.SENT_ETHER]: <img src={eth} alt="ETH" />,
    [TransactionCategories.CONTRACT_DEPLOYMENT]: <FiUpload />,
    [TransactionCategories.CONTRACT_INTERACTION]: <FaExchangeAlt />,
    [TransactionCategories.TOKEN_METHOD_APPROVE]: (
        <RiCopperCoinFill size="24px" />
    ),
    [TransactionCategories.TOKEN_METHOD_TRANSFER]: (
        <RiCopperCoinFill size="24px" />
    ),
    [TransactionCategories.TOKEN_METHOD_INCOMING_TRANSFER]: (
        <RiCopperCoinFill size="24px" />
    ),
    [TransactionCategories.TOKEN_METHOD_TRANSFER_FROM]: (
        <RiCopperCoinFill size="24px" />
    ),
    [TransactionCategories.EXCHANGE]: <RiCopperCoinFill size="24px" />,
    [TransactionCategories.BRIDGE]: <GiSuspensionBridge size="24px" />,
    [TransactionCategories.INCOMING_BRIDGE]: <GiSuspensionBridge size="24px" />,
    [TransactionCategories.INCOMING_BRIDGE_REFUND]: (
        <GiSuspensionBridge size="24px" />
    ),
    [TransactionCategories.INCOMING_BRIDGE_PLACEHOLDER]: (
        <GiSuspensionBridge size="24px" />
    ),
}

const failedStatuses = [
    TransactionStatus.FAILED,
    TransactionStatus.CANCELLED,
    TransactionStatus.DROPPED,
    TransactionStatus.REJECTED,
]

const PendingSpinner: React.FC<{
    size?: string
}> = ({ size = "16px" }) => (
    <ImSpinner
        size={size}
        className="animate-spin text-primary-black-default opacity-50"
    />
)

const TransactionIcon: React.FC<{
    transaction: {
        transactionCategory: TransactionCategories | undefined
        transactionStatus: TransactionStatus
    }
    transactionIcon?: string
}> = ({
    transaction: { transactionCategory: category, transactionStatus },
    transactionIcon,
}) => (
    <div className="align-start">
        {transactionStatus !== TransactionStatus.SUBMITTED ? (
            transactionIcon ? (
                <TokenLogo
                    name={""}
                    logo={transactionIcon}
                    filled={true}
                    logoSize="big"
                />
            ) : category ? (
                <div className={Classes.roundedIcon}>
                    {transactionIcons[category]}
                </div>
            ) : null
        ) : (
            <div className={Classes.roundedIcon}>
                <PendingSpinner />
            </div>
        )}
    </div>
)

const getTransactionTime = (
    status: TransactionStatus,
    metaType: MetaType,
    time: number,
    isQueued: boolean
) => {
    const [{ color, label }, extraInfo] = (() => {
        const displayTime = {
            color: "text-primary-grey-dark",
            label: getDisplayTime(new Date(time)),
        }
        // If the transaction that we wanted to cancel is sent
        // It means that cancelation failed
        if (
            status === TransactionStatus.CONFIRMED &&
            metaType === MetaType.REGULAR_CANCELLING
        )
            return [
                displayTime,
                {
                    color: "text-red-600",
                    label: "Failed to cancel",
                },
            ]
        else if (
            status === TransactionStatus.CONFIRMED &&
            metaType === MetaType.SPEED_UP
        )
            return [
                displayTime,
                {
                    color: "text-primary-blue-default",
                    label: "Sped up",
                },
            ]
        // If the transaction that was supposed to be sped up worked
        // It's a good as we pay less fee
        else if (
            status === TransactionStatus.CONFIRMED &&
            metaType === MetaType.REGULAR_SPEEDING_UP
        )
            return [displayTime]
        // If the transaction we wanted to cancel is either dropped or cancelled
        // It worked
        else if (
            failedStatuses.includes(status) &&
            metaType === MetaType.REGULAR_CANCELLING
        )
            return [{ color: "text-primary-blue-default", label: "Cancelled" }]
        // /!\ Really specific case /!\
        // the DROPPED + SPEEDING_UP is supposed to mean that the speed up work
        // However, the transaction is supposed to be filtered an not shown.
        // The only case where this will show is if both the SPEEDING_UP and SPEED_UP tx failed
        // and they were replaced by another tx with the same nonce manually
        else if (
            (status === TransactionStatus.DROPPED ||
                status === TransactionStatus.CANCELLED) &&
            metaType === MetaType.REGULAR_SPEEDING_UP
        )
            return [
                {
                    color: "text-red-600",
                    label: capitalize(status.toLowerCase()),
                },
            ]
        // If the cancelling/speeding up transaction is either dropped or cancelled
        // It failed
        else if (
            (status === TransactionStatus.DROPPED ||
                status === TransactionStatus.CANCELLED) &&
            (metaType === MetaType.CANCEL || metaType === MetaType.SPEED_UP)
        )
            return [{ color: "text-red-600", label: "Cancelled" }]
        // If we're here, we're waiting to see if the transaction will be cancelled
        else if (metaType === MetaType.REGULAR_CANCELLING && !isQueued)
            return [{ color: "text-primary-grey-dark", label: "Cancelling..." }]
        // If we're here, we're waiting to see if the transaction will be sped up
        else if (metaType === MetaType.REGULAR_SPEEDING_UP && !isQueued)
            return [
                { color: "text-primary-grey-dark", label: "Speeding up..." },
            ]
        else if (status === TransactionStatus.SUBMITTED)
            return !isQueued
                ? [{ color: "text-primary-grey-dark", label: "Pending..." }]
                : [{ color: "text-yellow-600", label: "Queued" }]
        else return [displayTime]
    })()

    return (
        <>
            <span className={`text-[11px] ${color}`}>{label}</span>
            {extraInfo && (
                <span className={`text-[11px] ${extraInfo.color} mt-0.5`}>
                    {extraInfo.label}
                </span>
            )}
        </>
    )
}

const getTransactionLabel = (
    status: TransactionStatus,
    metaType: MetaType,
    pendingIndex: number | undefined,
    transactionCategory: TransactionCategories | undefined,
    methodSignature: TransactionMeta["methodSignature"],
    networkNativeCurrency: { symbol: string },
    advancedData: TransactionMeta["advancedData"]
): string => {
    const getCategoryMessage = () => {
        const isPending =
            status === TransactionStatus.SUBMITTED && pendingIndex === 0

        if (!transactionCategory) {
            return "Transaction"
        }

        const txMessage = getTransactionMessage(
            transactionCategory,
            networkNativeCurrency.symbol,
            advancedData
        )

        return isPending
            ? getPendingTransactionMessage(
                  transactionCategory,
                  metaType,
                  networkNativeCurrency.symbol,
                  advancedData
              ) || txMessage
            : txMessage
    }

    const defaultCategory = getCategoryMessage()

    if (transactionCategory === TransactionCategories.CONTRACT_INTERACTION) {
        return methodSignature ? methodSignature.name : defaultCategory
    }

    return defaultCategory
}

const getTransactionTimeOrStatus = (
    status: TransactionStatus,
    metaType: MetaType,
    confirmationTime: number | undefined,
    submittedTime: number | undefined,
    time: number,
    isQueued: boolean,
    forceDrop: boolean,
    bridgeParams?: BridgeTransactionParams
) => {
    if (forceDrop) {
        return (
            <span className="text-[11px] text-red-600">
                {capitalize(TransactionStatus.DROPPED.toLowerCase())}
            </span>
        )
    }

    if (failedStatuses.includes(status) && metaType === MetaType.REGULAR) {
        return (
            <span className="text-[11px] text-red-600">
                {capitalize(
                    status === TransactionStatus.CANCELLED
                        ? "failed"
                        : status.toLowerCase()
                )}
            </span>
        )
    }

    if (
        bridgeParams?.substatus === BridgeSubstatus.REFUNDED &&
        bridgeParams.role !== "RECEIVING"
    ) {
        return (
            <span className="text-[11px] text-red-600">
                Failed bridge: Refunded
            </span>
        )
    }

    return getTransactionTime(
        status,
        metaType,
        confirmationTime || submittedTime || time,
        isQueued
    )
}

const TransactionItem: React.FC<{
    transaction: RichedTransactionMeta
    index: number
    itemHeight: number
    onClick: () => void
}> = ({ index, transaction, onClick, itemHeight }) => {
    const {
        transactionParams: { value, hash },
        methodSignature,
        status,
        time,
        confirmationTime,
        submittedTime,
        transferType,
        metaType,
        id,
        flashbots,
        isQueued,
        forceDrop,
        bridgeParams,
        transactionCategory,
        advancedData,
    } = transaction

    const bridgeTransactionsData = useGetBridgeTransactionsData(transaction)

    const history: any = useOnMountHistory()
    const formatter = useCurrencyFromatter()

    const { nativeCurrency: networkNativeCurrency, defaultNetworkLogo } =
        useSelectedNetwork()

    const txHash = hash
    let transfer = transferType ?? {
        amount: value ? value : BigNumber.from("0"),
        currency: networkNativeCurrency.symbol,
        decimals: networkNativeCurrency.decimals,
        logo: networkNativeCurrency.logo ?? defaultNetworkLogo,
    }

    const isBlankWithdraw: boolean =
        transactionCategory === "blankWithdrawal" ? true : false

    const isAllowanceApproval =
        transactionCategory === TransactionCategories.TOKEN_METHOD_APPROVE

    const approvalToken = isAllowanceApproval
        ? transaction.approveAllowanceParams?.token
        : undefined

    if (isAllowanceApproval) {
        //Change transaction logo to the approval Token Logo if it's an approval transaction
        if (approvalToken) {
            if (approvalToken.logo) {
                transfer.logo = approvalToken.logo
            } else {
                transfer.logo = unknownTokenIcon
            }
        }
        // TODO: Test and Remove if not required
        if (!transfer.amount) {
            transfer.amount = BigNumber.from("0")
        }
    }

    const label = getTransactionLabel(
        status,
        metaType,
        index,
        transactionCategory,
        methodSignature,
        networkNativeCurrency,
        advancedData
    )

    const txValueSign = (() => {
        switch (transactionCategory) {
            case TransactionCategories.INCOMING:
            case TransactionCategories.TOKEN_METHOD_INCOMING_TRANSFER:
            case TransactionCategories.BLANK_WITHDRAWAL:
            case TransactionCategories.INCOMING_BRIDGE:
            case TransactionCategories.INCOMING_BRIDGE_PLACEHOLDER:
            case TransactionCategories.INCOMING_BRIDGE_REFUND:
                return "+"

            default:
                return BigNumber.from(transfer.amount).eq(0) ? "" : "-"
        }
    })()

    const txValue = transfer.amount
        ? formatTransactionValue(transfer as TransferType, true, 5)[0]
        : ""

    const valueLabel = `${txValueSign}${txValue}`

    const { formattedLabel, typeCss, amountCss } = getTransactionItemStyles(
        label,
        valueLabel
    )

    const tokenSymbol = transfer.currency
        ? transfer.currency.toUpperCase()
        : networkNativeCurrency.symbol.toUpperCase()

    const transferCurrencyAmount = formatter.format(
        transfer.amount,
        tokenSymbol,
        transfer.decimals,
        transfer.currency === networkNativeCurrency.symbol.toUpperCase()
    )

    const canSpeedUpOrCancel =
        status === TransactionStatus.SUBMITTED &&
        metaType === MetaType.REGULAR &&
        transactionCategory !==
            TransactionCategories.INCOMING_BRIDGE_PLACEHOLDER &&
        !isBlankWithdraw

    return (
        <>
            <div
                className={classNames(
                    "flex flex-col px-6 py-4 transition duration-300 hover:bg-primary-grey-default",
                    "hover:bg-opacity-50 active:bg-primary-grey-hover active:bg-opacity-50 -ml-1 cursor-pointer",
                    txHash &&
                        transaction.transactionParams.from &&
                        "cursor-default"
                )}
                style={{
                    width: "calc(88% + 3rem)",
                    height: itemHeight,
                }}
                role="button"
                data-txid={txHash}
                onClick={() => {
                    if (txHash && transaction.transactionParams.from) {
                        onClick()
                    }
                }}
            >
                <div className="flex flex-row items-center w-full justify-between">
                    <TransactionIcon
                        transaction={{
                            transactionCategory,
                            transactionStatus: status,
                        }}
                        transactionIcon={transfer.logo}
                    />
                    <div
                        className="flex flex-col ml-2"
                        style={{ width: "calc(100% - 16px)" }}
                    >
                        <div
                            className="flex flex-row w-full items-center space-x-1"
                            style={typeCss}
                        >
                            <span
                                className="text-sm font-semibold truncate"
                                title={label}
                            >
                                {formattedLabel}
                            </span>
                            {flashbots && (
                                <AppIcon
                                    iconURL={flashbotsLogo}
                                    size={6}
                                    iconSize={5}
                                    title="Flashbots"
                                />
                            )}
                            {status === TransactionStatus.DROPPED &&
                                metaType === MetaType.REGULAR && (
                                    <div className="group relative self-start">
                                        <a
                                            href="https://blockwallet.io/docs/what-is-a-dropped-transaction"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <AiFillInfoCircle
                                                size={24}
                                                className="pl-2 pb-1 text-primary-grey-dark cursor-pointer hover:text-primary-blue-default"
                                            />
                                        </a>
                                        <Tooltip
                                            content={
                                                <div className="flex flex-col font-normal items-start text-xs text-white-500">
                                                    <div className="flex flex-row items-end space-x-7">
                                                        <span>
                                                            This transaction was
                                                            never mined.
                                                        </span>{" "}
                                                    </div>
                                                    <div className="flex flex-row items-end space-x-4">
                                                        <span>
                                                            Click on this icon
                                                            to learn more.
                                                        </span>{" "}
                                                    </div>
                                                </div>
                                            }
                                        />
                                    </div>
                                )}
                        </div>
                        {getTransactionTimeOrStatus(
                            status,
                            metaType,
                            confirmationTime,
                            submittedTime,
                            time,
                            isQueued || false,
                            forceDrop || false,
                            bridgeParams
                        )}

                        {canSpeedUpOrCancel && (
                            <div className="mt-2">
                                <button
                                    type="button"
                                    className={classnames(
                                        "rounded-md cursor-pointer text-primary-blue-default border-current border p-1 font-semibold hover:bg-primary-blue-default hover:text-white transition-colors",
                                        isQueued
                                            ? "opacity-50 pointer-events-none"
                                            : ""
                                    )}
                                    disabled={isQueued}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        history.push({
                                            pathname: "/transaction/speedUp",
                                            state: {
                                                txId: id,
                                            },
                                        })
                                    }}
                                >
                                    Speed up
                                </button>
                                <button
                                    type="button"
                                    className="ml-1.5 border p-1 rounded-md cursor-pointer text-primary-grey-dark border-current font-semibold hover:bg-gray-500 hover:text-white transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        history.push({
                                            pathname: "/transaction/cancel",
                                            state: {
                                                txId: id,
                                            },
                                        })
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Allowance */}
                    {isAllowanceApproval &&
                        approvalToken &&
                        transaction.approveAllowanceParams?.allowanceValue && (
                            <div
                                className={classNames(
                                    "flex flex-col items-end self-start"
                                )}
                                style={amountCss}
                            >
                                <div
                                    className={classnames(
                                        "w-full flex justify-end",
                                        transaction.approveAllowanceParams
                                            .isUnlimited
                                            ? "-mt-1"
                                            : null
                                    )}
                                    title={`${Number(
                                        formatUnits(
                                            transaction.approveAllowanceParams
                                                .allowanceValue,
                                            approvalToken.decimals
                                        )
                                    )} ${approvalToken.symbol}`}
                                >
                                    <span
                                        className={classNames(
                                            "text-sm font-semibold text-right truncate max-w-[130px]"
                                        )}
                                    >
                                        {transaction.approveAllowanceParams
                                            .isUnlimited ? (
                                            <span className="text-lg">
                                                &#8734;
                                            </span>
                                        ) : (
                                            `${formatUnits(
                                                transaction
                                                    .approveAllowanceParams
                                                    .allowanceValue,
                                                approvalToken.decimals
                                            )}`
                                        )}{" "}
                                        {approvalToken.symbol}
                                    </span>
                                </div>
                            </div>
                        )}

                    {/* Amount */}
                    {!isAllowanceApproval && transfer.amount && (
                        <div
                            className={classNames("flex flex-col items-end")}
                            style={amountCss}
                        >
                            <div
                                className="w-full flex justify-end"
                                title={formatTransactionValue(
                                    transfer as TransferType
                                ).reduce((acc, curr) => `${acc} ${curr}`, "")}
                            >
                                <span
                                    className={classNames(
                                        "text-sm font-semibold text-right truncate max-w-[130px]"
                                    )}
                                >
                                    {`${valueLabel} ${transfer.currency.toUpperCase()}`}
                                </span>
                            </div>
                            <div className="w-full flex justify-end">
                                <span
                                    className="text-[11px] text-primary-grey-dark truncate"
                                    title={transferCurrencyAmount}
                                >
                                    {transferCurrencyAmount}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                {status === TransactionStatus.CONFIRMED &&
                transactionCategory === TransactionCategories.BRIDGE &&
                bridgeParams &&
                BRIDGE_PENDING_STATUS.includes(bridgeParams!.status! || "") ? (
                    <div className="ml-11 mt-2">
                        <i className="text-primary-grey-dark">
                            <>
                                {
                                    getBridgePendingMessage(
                                        bridgeParams!,
                                        bridgeTransactionsData
                                            ?.receivingTransaction?.networkName
                                    )?.label
                                }
                                <Dots />
                            </>
                        </i>
                    </div>
                ) : null}
            </div>
        </>
    )
}

export default TransactionItem
