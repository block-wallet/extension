import { openHardwareReconnect } from "../../context/commActions"
import { DEVICE_RECONNECTION_WARNING_STEPS } from "../../util/connectionStepUtils"
import WarningDialog from "./WarningDialog"
import ClickableText from "../../components/button/ClickableText"
import Divider from "../Divider"
import { Devices, AccountType } from "../../context/commTypes"
import { isHardwareWallet } from "../../util/account"
import useHardwareWalletConnect from "../../util/hooks/useHardwareWalletConnect"
import { classnames } from "../../styles"
import { AiFillInfoCircle } from "react-icons/ai"
import Tooltip from "../label/Tooltip"
import log from "loglevel"

const HardwareDeviceNotLinkedDialog: React.FC<{
    isOpen: boolean
    onDone: () => void
    vendor?: Devices
    accountType?: AccountType
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
    accountType,
    address,
    showReconnect = true,
    fullScreen = false,
    useClickOutside = true,
    cancelButton = false,
    onCancel,
}) => {
        // Always call hooks unconditionally
        const { connect } = useHardwareWalletConnect()

        // Double-check that we're dealing with a hardware wallet account
        const isHwWallet = accountType ? isHardwareWallet(accountType) : !!vendor;

        // Early return if no vendor specified (indicates it's not a hardware wallet)
        // or if the dialog shouldn't be open or if it's not a hardware wallet account
        if (!isOpen || !vendor || !isHwWallet) {
            if (isOpen && (!vendor || !isHwWallet)) {
                log.warn('HardwareDeviceNotLinkedDialog opened for a non-hardware wallet account');
                // Close dialog if it somehow got opened for a non-hardware wallet
                setTimeout(onDone, 0);
            }
            return null;
        }

        const steps = vendor ? DEVICE_RECONNECTION_WARNING_STEPS[vendor] : []

        const connectAndClose = async () => {
            try {
                const resultOk = await connect(vendor)
                if (resultOk) {
                    onDone()
                }
            } catch (error) {
                log.error('Error connecting hardware wallet:', error)
            }
        }

        return (
            <WarningDialog
                open={isOpen}
                onDone={onDone}
                title="Hardware device is not detected"
                fullScreen={fullScreen}
                wideMargins={fullScreen}
                message={
                    <div className="text-gray-900 dark:text-gray-100">
                        <p className="pb-3 text-gray-700 dark:text-gray-300">
                            We're having trouble connecting with your hardware
                            device.
                        </p>
                        <Divider />
                        <div className="text-left">
                            <p className={`${!fullScreen ? "pt-3" : "pt-4"} text-gray-800 dark:text-gray-200 font-medium`}>
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
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {index + 1}.&nbsp;{step.label}
                                        </span>
                                        {step.info && (
                                            <div className="group relative">
                                                <AiFillInfoCircle
                                                    size={26}
                                                    className="pl-2 text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-blue-default dark:hover:text-primary-blue-400 transition-colors duration-200"
                                                />
                                                <Tooltip
                                                    className="!-translate-x-48 !w-60 !break-word !whitespace-normal"
                                                    content={
                                                        <span className="text-gray-700 dark:text-gray-300">
                                                            {step.info}
                                                        </span>
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {showReconnect && (
                                <span className="text-xs text-gray-600 dark:text-gray-400">
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
