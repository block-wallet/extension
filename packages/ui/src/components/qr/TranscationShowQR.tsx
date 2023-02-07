import { FC } from "react"
import classnames from "classnames"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import PopupFooter from "../popup/PopupFooter"
import PopupHeader from "../popup/PopupHeader"
import PopupLayout from "../popup/PopupLayout"
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
        // <PopupLayout
        //     header={
        //         <PopupHeader
        //             title=""
        //             networkIndicator
        //             keepState
        //             onBack={onBack}
        //         />
        //     }
        //     footer={
        //         <PopupFooter>
        //             <div className="flex justify-center items-center h-12 w-full">

        //             </div>
        //         </PopupFooter>
        //     }
        // >
        //     <div className="pt-8 px-8 flex w-full">
        //         <span className=" px-6 text-base leading-relaxed text-center text-gray-600 w-full">
        //             Please scan this QR code with your Keystone and request
        //             signature.
        //         </span>
        //     </div>
        //     <div className="items-center">

        //     </div>
        // </PopupLayout>
        <div className="flex flex-col items-center justify-center">
            Scan QR
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
                                {QRValue ? (
                                    <QRCode
                                        id="myqr"
                                        value={QRValue}
                                        size={300}
                                        includeMargin={true}
                                    />
                                ) : (
                                    <div>
                                        <span>Missing QR code</span>
                                    </div>
                                )}
                                <Divider />
                                <div className="flex w-full space-x-2">
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
            }
        </div>
    )
}

export default TransactionShowQR
