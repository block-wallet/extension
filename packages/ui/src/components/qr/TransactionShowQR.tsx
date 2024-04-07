import { FC, useEffect, useState } from "react"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import { Classes } from "../../styles"
import QRCode from "qrcode.react"
import Divider from "../Divider"
import Spinner from "../spinner/Spinner"

interface Props {
    QRValues?: string[]
    onBack: () => void
    onSuccess: () => void
}

const TransactionShowQR: FC<Props> = ({ onBack, onSuccess, QRValues }) => {
    const [QRValue, setQRValue] = useState("")
    const [index, setIndex] = useState(0)

    useEffect(() => {
        const timeoutRef = setTimeout(() => {
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

        return () => {
            clearTimeout(timeoutRef)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [QRValue, QRValues])

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
                                <div className="flex items-center w-64 h-64 pl-28">
                                    <Spinner color={"black"} size={"40"} />
                                </div>
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
