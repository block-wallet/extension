import { useCallback, useEffect } from "react"
import { useWaitingDialog } from "../../components/dialog/WaitingDialog"
import {
    AccountType,
    Devices,
    HardwareWalletOpTypes,
    TransactionStatus,
} from "../commTypes"
import { getAwaitingSigningMessage } from "../../util/getAwaitingSigningMessage"
import {
    isTransactionOrRequestAwaitingSigning,
    isTransactionOrRequestRejected,
} from "../../util/transactionUtils"
import { DappRequestSigningStatus } from "./useDappRequest"
import AnimatedIcon, { AnimatedIconName } from "../../components/AnimatedIcon"
import Divider from "../../components/Divider"
import ClickableText from "../../components/button/ClickableText"
import { isHardwareWallet } from "../../util/account"
import { useBlankState } from "../background/backgroundHooks"
import useCountdown from "../../util/hooks/useCountdown"
import { secondsToMMSS } from "../../util/time"
import { QRTransactionParams } from "@block-wallet/background/controllers/transactions/utils/types"
import { getDeviceFromAccountType } from "../../util/hardwareDevice"
import TransactionQR from "../../components/qr/TransactionQR"
import {
    hardwareQrCancelSignRequest,
    hardwareQrSubmitSignature,
} from "../commActions"
import { URParameter } from "@block-wallet/background/utils/types/communication"

const messages: {
    [key in HardwareWalletOpTypes]: {
        texts: { confirming: string; failed: string; rejected: string }
        titles: { confirming: string; failed: string; rejected: string }
    }
} = {
    SIGN_TRANSACTION: {
        texts: {
            confirming: "Confirming transaction...",
            failed: "Error confirming transaction",
            rejected: "Transaction was rejected",
        },
        titles: {
            confirming: "Confirming...",
            failed: "Error",
            rejected: "Transaction Rejected",
        },
    },
    SIGN_MESSAGE: {
        texts: {
            confirming: "Signing request...",
            failed: "Error signing message",
            rejected: "Signing request was rejected",
        },
        titles: {
            confirming: "Confirming...",
            failed: "Error",
            rejected: "Request Rejected",
        },
    },
    APPROVE_ALLOWANCE: {
        texts: {
            confirming: "Updating token allowance...",
            failed: "Error updating token allowance",
            rejected: "Token allowance request was rejected",
        },
        titles: {
            confirming: "Confirming...",
            failed: "Error",
            rejected: "Token Allowance Rejected",
        },
    },
    SIGN_CANCEL: {
        texts: {
            confirming: "Trying to cancel the transaction...",
            failed: "Error cancelling the transaction",
            rejected: "Cancel request was rejected",
        },
        titles: {
            confirming: "Cancelling...",
            failed: "Error",
            rejected: "Rejected",
        },
    },
    SIGN_SPEEDUP: {
        texts: {
            confirming: "Trying to speed up the transaction...",
            failed: "Error speeding up the transaction",
            rejected: "Speed up request was rejected",
        },
        titles: {
            confirming: "Speeding up...",
            failed: "Error",
            rejected: "Rejected",
        },
    },
}

const Timer = ({
    seconds,
    operation,
}: {
    seconds: number
    operation: HardwareWalletOpTypes
}) => {
    const names = {
        [HardwareWalletOpTypes.APPROVE_ALLOWANCE]: "token allowance request",
        [HardwareWalletOpTypes.SIGN_CANCEL]: "cancel transaction request",
        [HardwareWalletOpTypes.SIGN_TRANSACTION]: "transaction",
        [HardwareWalletOpTypes.SIGN_SPEEDUP]: "speed up transaction request",
        [HardwareWalletOpTypes.SIGN_MESSAGE]: "sign message request",
    }
    const initialCaption = `Your ${names[operation]} will be automatically cancelled in `
    let timeData = secondsToMMSS(seconds)
    return (
        <span>
            {initialCaption} <span className="font-semibold">{timeData}</span>
        </span>
    )
}

const useTransactionTimeout = () => {
    const { txSignTimeout } = useBlankState()!
    return txSignTimeout
}

const WaitingHWConfirmation = ({
    message,
    operation,
    reject,
    txTime,
    txTimeout,
}: {
    message: string
    operation: HardwareWalletOpTypes
    reject: () => void
    txTime?: number
    txTimeout?: number
}) => {
    const { value: remainingSeconds } = useCountdown(txTime, txTimeout)

    return (
        <div className="flex flex-col items-center justify-center">
            {message}
            {
                <div className="mt-2">
                    <Divider />
                    <div className="mt-2 text-xs">
                        {remainingSeconds && (
                            <Timer
                                seconds={remainingSeconds}
                                operation={operation}
                            />
                        )}
                        <br />
                        <div className="mt-1">
                            <span>
                                <i>OR</i>
                            </span>
                            <br />
                            <ClickableText onClick={reject}>
                                <i>
                                    {`Reject ${
                                        operation ===
                                        HardwareWalletOpTypes.SIGN_MESSAGE
                                            ? "request now"
                                            : "transaction now"
                                    }`}
                                </i>
                            </ClickableText>
                        </div>
                    </div>
                </div>
            }
        </div>
    )
}
export const useTransactionWaitingDialog = (
    transaction:
        | {
              id?: string
              status: TransactionStatus | DappRequestSigningStatus | undefined
              error: Error | undefined
              epochTime?: number
              qrParams?: QRTransactionParams
          }
        | undefined,
    operation: HardwareWalletOpTypes,
    accountType: AccountType,
    callbacks: {
        reject: () => void
    }
) => {
    const keystoneVendor =
        getDeviceFromAccountType(accountType) === Devices.KEYSTONE
    const trezorVendor =
        getDeviceFromAccountType(accountType) === Devices.TREZOR
    const { texts, titles, dispatch, status, isOpen, gifs } = useWaitingDialog({
        defaultStatus: "idle",
        defaultIsOpen: true,
    })

    const txTimeout = useTransactionTimeout()

    useEffect(() => {
        if (transaction?.status) {
            if (isTransactionOrRequestAwaitingSigning(transaction.status)) {
                const message = messages[operation]
                const hwDeviceMessage = getAwaitingSigningMessage(
                    accountType,
                    transaction?.status,
                    operation
                )

                dispatch({
                    type: "open",
                    payload: {
                        status: "loading",
                        titles: { loading: message.titles.confirming },
                        texts: {
                            loading: isHardwareWallet(accountType) ? (
                                !keystoneVendor ? (
                                    <WaitingHWConfirmation
                                        message={
                                            hwDeviceMessage ??
                                            message.texts.confirming
                                        }
                                        operation={operation}
                                        reject={callbacks.reject}
                                        txTime={transaction?.epochTime}
                                        txTimeout={txTimeout}
                                    />
                                ) : (
                                    <TransactionQR
                                        qrParams={transaction.qrParams}
                                        onBack={() => {
                                            callbacks.reject()
                                            hardwareQrCancelSignRequest()
                                        }}
                                        onQRSignatureProvided={(
                                            ur: URParameter
                                        ) => {
                                            if (transaction.qrParams) {
                                                return hardwareQrSubmitSignature(
                                                    transaction.qrParams
                                                        .requestId,
                                                    ur
                                                )
                                            } else {
                                                callbacks.reject()
                                                return hardwareQrCancelSignRequest()
                                            }
                                        }}
                                    />
                                )
                            ) : (
                                message.texts.confirming
                            ),
                        },
                        gifs: {
                            loading: isHardwareWallet(accountType) ? (
                                <AnimatedIcon
                                    className="w-12 h-12 m-auto"
                                    icon={AnimatedIconName.DeviceInteraction}
                                />
                            ) : undefined,
                        },
                    },
                })
            } else if (
                [
                    TransactionStatus.SUBMITTED,
                    DappRequestSigningStatus.SIGNED,
                ].includes(transaction.status)
            ) {
                dispatch({ type: "setStatus", payload: { status: "success" } })
            } else if (
                [
                    TransactionStatus.FAILED,
                    DappRequestSigningStatus.FAILED,
                ].includes(transaction.status) &&
                !trezorVendor
            ) {
                const message = messages[operation]
                dispatch({
                    type: "setStatus",
                    payload: {
                        status: "error",
                        titles: {
                            error: message.titles.failed,
                        },
                        texts: {
                            error:
                                transaction.error?.message ||
                                message.texts.failed,
                        },
                    },
                })
            } else if (
                isTransactionOrRequestRejected(transaction.status, trezorVendor)
            ) {
                const message = messages[operation]
                dispatch({
                    type: "setStatus",
                    payload: {
                        status: "error",
                        titles: { error: message.titles.rejected },
                        texts: {
                            error: message.texts.rejected,
                        },
                    },
                })
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        transaction?.id,
        transaction?.status,
        transaction?.error,
        transaction?.epochTime,
        transaction?.qrParams,
        transaction?.qrParams?.requestId,
        transaction?.qrParams?.qrSignRequest,
        dispatch,
        operation,
        accountType,
        callbacks.reject,
        txTimeout,
    ])

    return {
        closeDialog: useCallback(() => dispatch({ type: "close" }), [dispatch]),
        isOpen,
        texts,
        titles,
        status,
        dispatch,
        gifs,
    }
}
