import { FC } from "react"
import QrContainer from "./QRReader"
import Divider from "../Divider"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import { Classes } from "../../styles"

interface Props {
    onBack: () => void
    onCancel: () => void
    onSuccess: (qrSignature: string) => Promise<boolean>
}

const SendSignReadQR: FC<Props> = ({ onBack, onCancel, onSuccess }) => {
    const onQRRead = async (qr: string): Promise<boolean> => {
        return onSuccess(qr)
    }

    return (
        <div className="flex flex-col items-center justify-center">
            <div>
                <div className="mt-2 text-xs">
                    <div className="mt-1">
                        <span>
                            Please scan your Keystone QR code. The blur effect
                            does not affect the scanning.
                        </span>
                        <div className="items-center">
                            <QrContainer
                                onRead={onQRRead}
                                className="w-64 h-64"
                            />
                            <Divider />
                            <div className="flex w-full space-x-2 mt-3">
                                <ButtonWithLoading
                                    label="Return"
                                    buttonClass={Classes.whiteButton}
                                    onClick={onBack}
                                />
                                <ButtonWithLoading
                                    label="Cancel"
                                    buttonClass={Classes.darkButton}
                                    onClick={onCancel}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SendSignReadQR
