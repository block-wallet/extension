import {
    AccountType,
    HardwareWalletOpTypes,
    TransactionStatus,
} from "../context/commTypes"
import { DappRequestSigningStatus } from "../context/hooks/useDappRequest"
import { isHardwareWallet } from "./account"
import { isTransactionOrRequestAwaitingSigning } from "./transactionUtils"

/**
 * getAwaitingSigningMessage
 *
 * It returns a message to be displayed to the user while waiting for a transaction or signing request to be confirmed in the device
 * if the account belongs to a hardware wallet and the transaction or signing request is awaiting approval.
 *
 * @param accountType The account type
 * @param status The transaction/signing request status
 * @returns The message to display when awaiting signing
 */
// TODO (KEYSTONE): Add a proper message for keystone flow.
export const getAwaitingSigningMessage = (
    accountType: AccountType,
    status: TransactionStatus | DappRequestSigningStatus,
    opType: HardwareWalletOpTypes = HardwareWalletOpTypes.SIGN_TRANSACTION
): string | undefined => {
    return isHardwareWallet(accountType) &&
        // Only display the message if the transaction or signing request is in APPROVED status(previous to SIGNED)
        isTransactionOrRequestAwaitingSigning(status)
        ? `Waiting for ${
              [
                  HardwareWalletOpTypes.SIGN_TRANSACTION,
                  HardwareWalletOpTypes.APPROVE_ALLOWANCE,
                  HardwareWalletOpTypes.SIGN_CANCEL,
                  HardwareWalletOpTypes.SIGN_SPEEDUP,
              ].includes(opType)
                  ? " your transaction"
                  : opType === HardwareWalletOpTypes.SIGN_MESSAGE
                  ? "the signing message request"
                  : "request"
          } to be confirmed on your ${accountType} device.`
        : undefined
}
