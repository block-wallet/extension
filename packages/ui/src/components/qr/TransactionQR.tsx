import { FC, useState } from "react"
import TransactionShowQR from "./TranscationShowQR"
import TransactionReadQR from "./TransactionReadQR"
import { QRTransactionParams } from "@block-wallet/background/controllers/transactions/utils/types"

interface Props {
    qrParams?: QRTransactionParams
    onBack: () => void
    onQRSignatureProvided: (qrSignature: string) => void
}

const TransactionQR: FC<Props> = ({
    onBack,
    qrParams,
    onQRSignatureProvided,
}) => {
    const [showQrDone, setShowQRDone] = useState(false)

    return !showQrDone ? (
        <TransactionShowQR
            QRValue={qrParams?.qrSignRequest}
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
            onSuccess={onQRSignatureProvided}
        />
    )
}

export default TransactionQR
