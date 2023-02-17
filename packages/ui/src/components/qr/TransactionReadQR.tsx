import { FC, useState } from "react"
import QrContainer from "./QRReader"
import useVideoDeviceConnect from "../../util/hooks/useVideoDeviceConnect"
import Divider from "../Divider"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import classnames from "classnames"
import { Classes } from "../../styles"

interface Props {
    onBack: () => void
    onCancel: () => void
    onSuccess: (qrSignature: string) => void
}

const SendSignReadQR: FC<Props> = ({ onBack, onCancel, onSuccess }) => {
    const { connect } = useVideoDeviceConnect(true)
    const [deviceNotReady, setDeviceNotReady] = useState(false)

    const onQRRead = async (qr: string): Promise<boolean> => {
        const resultOk = await connect()
        if (resultOk) {
            setDeviceNotReady(resultOk)
            onSuccess(qr)
        }
        return resultOk
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
                                deviceNotReady={deviceNotReady}
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
