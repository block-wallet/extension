import { FC, useEffect, useState } from "react"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import { Classes } from "../../styles"
import QRCode from "qrcode.react"
import Divider from "../Divider"

function sleep(ms: number): Promise<unknown> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

interface Props {
    QRValues?: string[]
    onBack: () => void
    onSuccess: () => void
}

const TransactionShowQR: FC<Props> = ({ onBack, onSuccess, QRValues }) => {
    const [QRValue, setQRValue] = useState("")
    const [index, setIndex] = useState(0)

    useEffect(() => {
        setTimeout(() => {
            if (QRValues && QRValues.length) {
                if (index < QRValues.length) {
                    setQRValue(QRValues[index])
                }

                let newIndex = index + 1
                if (newIndex >= QRValues.length) {
                    newIndex = 0
                }
                setIndex(newIndex)
            }
        }, 1200)
    }, [QRValue])

    return (
        <div className="flex flex-col items-center justify-center">
            <div>
                <div className="mt-2 text-xs">
                    <div className="mt-1">
                        <span>
                            Please scan the QR code using your Keystone.
                        </span>
                        <div className="items-center">
                            {QRValue ? (
                                <QRCode
                                    value={QRValue}
                                    size={256}
                                    includeMargin={true}
                                />
                            ) : (
                                <div className="w-64 h-64"></div>
                            )}
                            <Divider />
                            <div className="flex w-full space-x-2 mt-3">
                                <ButtonWithLoading
                                    label="Cancel"
                                    buttonClass={Classes.whiteButton}
                                    onClick={onBack}
                                />
                                <ButtonWithLoading
                                    label="Request"
                                    buttonClass={Classes.button}
                                    onClick={onSuccess}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TransactionShowQR
