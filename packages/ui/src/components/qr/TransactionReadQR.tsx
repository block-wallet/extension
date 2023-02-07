import { FC, useState } from "react"
import QrContainer from "./QRReader"
import useVideoDeviceConnect from "../../util/hooks/useVideoDeviceConnect"
import Divider from "../Divider"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import classnames from "classnames"
import { Classes } from "../../styles"

interface Props {
    onBack: () => void
    onSuccess: () => void
}

const SendSignReadQR: FC<Props> = ({ onBack, onSuccess }) => {
    const { connect } = useVideoDeviceConnect(true)
    const [deviceNotReady, setDeviceNotReady] = useState(false)

    const onQRRead = async (qr: string) => {
        const resultOk = await connect()
        setDeviceNotReady(!resultOk)
        if (resultOk) {
            onSuccess
        }
    }

    return (
        // <PopupLayout
        //     header={
        //         <PopupHeader
        //             title=""
        //             networkIndicator
        //             keepState
        //             onBack={onBack}
        //         />
        //     }
        // >
        //     <div className="pt-8 px-8 flex w-full">
        //         <span className=" px-6 text-base leading-relaxed text-center text-gray-600 w-full">

        //         </span>
        //     </div>

        // </PopupLayout>
        <div className="flex flex-col items-center justify-center">
            QR Signature
            {
                <div className="mt-2">
                    <Divider />
                    <div className="mt-2 text-xs">
                        <div className="mt-1">
                            <span>
                                Please scan your Keystone QR code. The blur
                                effect does not affect the scanning ability.
                            </span>
                            <br />
                            <div className="items-center">
                                <QrContainer
                                    onRead={onQRRead}
                                    deviceNotReady={deviceNotReady}
                                />
                            </div>
                            <Divider />
                            <div>
                                <ButtonWithLoading
                                    label="Cancel"
                                    buttonClass={classnames(
                                        Classes.liteButton,
                                        "h-6"
                                    )}
                                    onClick={onBack}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            }
        </div>
    )
}

export default SendSignReadQR
