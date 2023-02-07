import { FC } from "react"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import { Classes } from "../../styles"
import QRCode from "qrcode.react"
import Divider from "../Divider"

interface Props {
    QRValue?: string
    onBack: () => void
    onSuccess: () => void
}

const TransactionShowQR: FC<Props> = ({ onBack, onSuccess, QRValue }) => {
    return (
        <div className="flex flex-col items-center justify-center">
            <div>
                <div className="mt-2 text-xs">
                    <div className="mt-1">
                        <span>Please scan your Keystone QR code.</span>
                        <div className="items-center">
                            {QRValue ? (
                                <QRCode
                                    value={QRValue}
                                    size={260}
                                    includeMargin={true}
                                />
                            ) : (
                                <div>
                                    <span>Missing QR code</span>
                                </div>
                            )}
                            <Divider />
                            <div className="flex w-full space-x-2 mt-3">
                                <ButtonWithLoading
                                    label="Cancel"
                                    buttonClass={Classes.darkButton}
                                    onClick={onBack}
                                />
                                <ButtonWithLoading
                                    label="Get signature"
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
