import { openHardwareReconnect } from "../../context/commActions"
import { DEVICE_RECONNECTION_WARNING_STEPS } from "../../util/connectionStepUtils"
import WarningDialog from "./WarningDialog"
import ClickableText from "../../components/button/ClickableText"
import Divider from "../Divider"
import { Devices } from "../../context/commTypes"
import useHardwareWalletConnect from "../../util/hooks/useHardwareWalletConnect"
import { classnames } from "../../styles"
import { AiFillInfoCircle } from "react-icons/ai"
import Tooltip from "../label/Tooltip"

const HardwareDeviceNotLinkedDialog: React.FC<{
    isOpen: boolean
    onDone: () => void
    vendor?: Devices
    fullScreen?: boolean
    showReconnect?: boolean
    address?: string
    useClickOutside?: boolean
    cancelButton?: boolean
    onCancel?: () => void
}> = ({
    isOpen,
    onDone,
    vendor,
    address,
    showReconnect = true,
    fullScreen = false,
    useClickOutside = true,
    cancelButton = false,
    onCancel,
}) => {
    const steps = vendor ? DEVICE_RECONNECTION_WARNING_STEPS[vendor] : []
    const { connect } = useHardwareWalletConnect()
    const connectAndClose = async () => {
        try {
            const resultOk = await connect(vendor!)
            if (resultOk) {
                onDone()
            }
        } catch (error) {}
    }
    return (
        <WarningDialog
            open={isOpen}
            onDone={onDone}
            title="Hardware device is not detected"
            fullScreen={fullScreen}
            wideMargins={fullScreen}
            message={
                <div>
                    <p className="pb-3">
                        We're having trouble connecting with your hardware
                        device.
                    </p>
                    <Divider />
                    <div className="text-left">
                        <p className={!fullScreen ? "pt-3" : "pt-4"}>
                            Please ensure that you have:
                        </p>
                        <div
                            className={classnames(
                                "w-full px-2",
                                !fullScreen
                                    ? "py-2 pb-1 space-y-1"
                                    : "py-4 space-y-2"
                            )}
                        >
                            {steps.map((step, index) => (
                                <div
                                    className="flex flex-row items-center h-7"
                                    key={index}
                                >
                                    <span className="text-sm">
                                        {index + 1}.&nbsp;{step.label}
                                    </span>
                                    {step.info && (
                                        <div className="group relative">
                                            <AiFillInfoCircle
                                                size={26}
                                                className="pl-2 text-primary-200 cursor-pointer hover:text-primary-300"
                                            />
                                            <Tooltip
                                                className="!-translate-x-48 !w-60 !break-word !whitespace-normal border boder-gray-300"
                                                content={step.info}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {showReconnect && (
                            <span className="text-xs">
                                Issue persists?{" "}
                                <ClickableText
                                    onClick={() =>
                                        address
                                            ? openHardwareReconnect(address)
                                            : connectAndClose()
                                    }
                                >
                                    reconnect your device
                                </ClickableText>
                            </span>
                        )}
                    </div>
                </div>
            }
            buttonLabel={"Try again"}
            useClickOutside={useClickOutside}
            cancelButton={cancelButton}
            onCancel={onCancel}
        />
    )
}

export default HardwareDeviceNotLinkedDialog
