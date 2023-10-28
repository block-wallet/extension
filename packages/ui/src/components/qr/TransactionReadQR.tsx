import { FC } from "react"
import QrContainer, { URParameter } from "./QRReader"
import Divider from "../Divider"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import { Classes } from "../../styles"
import { URType } from "@keystonehq/animated-qr"

interface Props {
    onBack: () => void
    onCancel: () => void
    onSuccess: (ur: URParameter) => Promise<boolean>
}

const SendSignReadQR: FC<Props> = ({ onBack, onCancel, onSuccess }) => {
    const onQRRead = async (ur: URParameter): Promise<boolean> => {
        return onSuccess(ur)
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
                                urTypes={[
                                    URType.ETH_SIGNATURE,
                                    URType.EVM_SIGNATURE,
                                    URType.SOL_SIGNATURE,
                                ]}
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
