import { FC, useState } from "react"
import QrContainer from "./QRReader"
import useVideoDeviceConnect from "../../util/hooks/useVideoDeviceConnect"
import Divider from "../Divider"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import classnames from "classnames"
import { Classes } from "../../styles"

interface Props {
    onBack: () => void
    onSuccess: (qrSignature: string) => void
}

const SendSignReadQR: FC<Props> = ({ onBack, onSuccess }) => {
    const { connect } = useVideoDeviceConnect(true)
    const [deviceNotReady, setDeviceNotReady] = useState(false)

    const onQRRead = async (qr: string) => {
        const resultOk = await connect()
        setDeviceNotReady(!resultOk)
        if (resultOk) {
            onSuccess(qr)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="mt-2">
                <div className="mt-2 text-xs">
                    <div className="mt-1">
                        <span>
                            Please scan your Keystone QR code. The blur effect
                            does not affect the scanning ability.
                        </span>
                        <br />
                        <div className="items-center">
                            <QrContainer
                                onRead={onQRRead}
                                deviceNotReady={deviceNotReady}
                            />
                        </div>
                        <Divider />
                        <div className="flex w-full space-x-2 mt-3">
                            <ButtonWithLoading
                                label="Cancel"
                                buttonClass={Classes.darkButton}
                                onClick={onBack}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SendSignReadQR
