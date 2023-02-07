import { FC, useState } from "react"
import TransactionShowQR from "./TranscationShowQR"
import TransactionReadQR from "./TransactionReadQR"

interface Props {
    QRValue?: string
    onBack: () => void
    onQRSignatureProvided: () => void
}

const TransactionQR: FC<Props> = ({
    onBack,
    QRValue,
    onQRSignatureProvided,
}) => {
    const [showQrDone, setShowQRDone] = useState(false)

    return !showQrDone ? (
        <TransactionShowQR
            QRValue={QRValue}
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
