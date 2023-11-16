import { FC, useState } from "react"
import TransactionShowQR from "./TransactionShowQR"
import TransactionReadQR from "./TransactionReadQR"
import { QRTransactionParams } from "@block-wallet/background/controllers/transactions/utils/types"
import { URParameter } from "./QRReader"

interface Props {
    qrParams?: QRTransactionParams
    onBack: () => void
    onQRSignatureProvided: (ur: URParameter) => Promise<boolean>
}

const TransactionQR: FC<Props> = ({
    onBack,
    qrParams,
    onQRSignatureProvided,
}) => {
    const [showQrDone, setShowQRDone] = useState(false)

    return !showQrDone ? (
        <TransactionShowQR
            QRValues={qrParams?.qrSignRequest}
            onBack={onBack}
            onSuccess={() => {
                setShowQRDone(true)
            }}
        />
    ) : (
        <TransactionReadQR
            onBack={() => {
                setShowQRDone(false)
            }}
            onCancel={onBack}
            onSuccess={onQRSignatureProvided}
        />
    )
}

export default TransactionQR
