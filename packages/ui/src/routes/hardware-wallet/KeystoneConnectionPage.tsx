import { useEffect, useState } from "react"
//Context
import { Devices } from "../../context/commTypes"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
//Components
import QrContainer, { URParameter } from "../../components/qr/QRReader"
//Layout
import HardwareWalletSetupLayout from "./SetupLayout"
import ConnectDeviceStepsLayout from "./ConnectDeviceStepsLayout"
//Utils
import useHardwareWalletConnect from "../../util/hooks/useHardwareWalletConnect"
import { DEVICE_CONNECTION_STEPS } from "../../util/connectionStepUtils"
import classNames from "classnames"
import { Classes } from "../../styles"
import { URType } from "@keystonehq/animated-qr"
import {
    checkHardwareWalletCompatibility,
    ConnectionErrorType,
    getConnectionErrorMessage
} from "../../util/browserDetection"
import log from "loglevel"
import WarningDialog from "../../components/dialog/WarningDialog"

// Custom Error Dialog component for different error types
interface ErrorDialogProps {
    isOpen: boolean;
    errorType: ConnectionErrorType;
    recommendations: string[];
    onClose: () => void;
    onRetry?: () => void;
}

const ConnectionErrorDialog: React.FC<ErrorDialogProps> = ({
    isOpen,
    errorType,
    recommendations,
    onClose,
    onRetry
}) => {
    return (
        <WarningDialog
            open={isOpen}
            title={getConnectionErrorMessage(errorType)}
            message={
                <div>
                    <p className="pb-3">
                        We encountered an issue while trying to connect your hardware wallet.
                    </p>
                    {recommendations.map((recommendation, index) => (
                        <p key={index} className="pb-2">
                            {recommendation}
                        </p>
                    ))}
                </div>
            }
            onDone={onRetry || onClose}
            buttonLabel={onRetry ? "Retry" : "Back"}
            useClickOutside={false}
            fullScreen={true}
            cancelButton={!!onRetry}
            onCancel={onRetry ? onClose : undefined}
        />
    )
}

const KeystoneConnectionPage = () => {
    const vendor = Devices.KEYSTONE
    const history = useOnMountHistory()
    const { connect } = useHardwareWalletConnect(true)
    const [deviceNotReady, setDeviceNotReady] = useState(false)
    const deviceSteps = DEVICE_CONNECTION_STEPS[vendor]
    const [showConnectSteps, setShowConnectSteps] = useState(true)
    const [browserCompatibility, setBrowserCompatibility] = useState(
        checkHardwareWalletCompatibility()
    )
    const [connectionError, setConnectionError] = useState<{
        type: ConnectionErrorType;
        recommendations: string[];
    } | null>(null)

    // Check browser compatibility when component mounts
    useEffect(() => {
        const compatibility = checkHardwareWalletCompatibility()
        setBrowserCompatibility(compatibility)

        if (!compatibility.isCompatible && compatibility.errorType) {
            setConnectionError({
                type: compatibility.errorType,
                recommendations: compatibility.recommendations
            })
        }
    }, [])

    const handleErrorDialogClose = () => {
        setConnectionError(null)

        // If the error is browser incompatibility, go back
        if (connectionError?.type === ConnectionErrorType.BROWSER_INCOMPATIBLE ||
            connectionError?.type === ConnectionErrorType.USB_NOT_SUPPORTED) {
            history.goBack()
        }
    }

    const onQRRead = async (ur: URParameter) => {
        // If browser is not compatible, show error dialog
        if (!browserCompatibility.isCompatible) {
            setConnectionError({
                type: browserCompatibility.errorType || ConnectionErrorType.BROWSER_INCOMPATIBLE,
                recommendations: browserCompatibility.recommendations
            })
            return false
        }

        try {
            const resultOk = await connect(vendor, ur)
            if (resultOk) {
                history.push({
                    pathname: "/hardware-wallet/accounts",
                    state: { vendor },
                })
            }
            return resultOk
        } catch (error) {
            log.error("Keystone connection error:", error)

            // Determine error type based on error message
            let errorType = ConnectionErrorType.UNKNOWN_ERROR
            let recommendations = [
                "Please ensure your Keystone device is ready.",
                "Try generating a new QR code on your device."
            ]

            if (error instanceof Error) {
                const errorMessage = error.message.toLowerCase()

                if (errorMessage.includes("invalid") || errorMessage.includes("format")) {
                    errorType = ConnectionErrorType.DEVICE_NOT_READY
                    recommendations = [
                        "The QR code format is not valid.",
                        "Make sure you're using the correct QR code format from your Keystone device."
                    ]
                }
            }

            setConnectionError({
                type: errorType,
                recommendations
            })
            return false
        }
    }

    const proceedToQRScan = () => {
        // If browser is not compatible, show error dialog instead of proceeding
        if (!browserCompatibility.isCompatible) {
            setConnectionError({
                type: browserCompatibility.errorType || ConnectionErrorType.BROWSER_INCOMPATIBLE,
                recommendations: browserCompatibility.recommendations
            })
            return
        }

        setShowConnectSteps(false)
    }

    return (
        <>
            {showConnectSteps ? (
                <ConnectDeviceStepsLayout
                    title="Before We Get Started"
                    subtitle={`Make sure you complete these ${deviceSteps.length} steps before you continue.`}
                    isLoading={false}
                    onConnect={proceedToQRScan}
                    steps={deviceSteps}
                    stepFontSize="md"
                />
            ) : (
                <HardwareWalletSetupLayout
                    title={"Show Keystone QR code"}
                    subtitle={"The camera is blurred but it won't affect the scanning."}
                    buttons={
                        <>
                            <div className="p-8 w-80 flex space-x-5 ml-auto mr-auto">
                                <button
                                    className={classNames(Classes.liteButton, "h-14")}
                                    onClick={() => setShowConnectSteps(true)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    }
                    childrenClass={"items-center w-3/5 my-4"}
                    buttonClass={"w-full flex space-x-5"}
                >
                    <QrContainer
                        onRead={onQRRead}
                        deviceNotReady={deviceNotReady}
                        urTypes={[
                            URType.CRYPTO_HDKEY,
                            URType.CRYPTO_MULTI_ACCOUNTS,
                            URType.CRYPTO_ACCOUNT,
                        ]}
                    />
                </HardwareWalletSetupLayout>
            )}

            {/* Connection error dialog */}
            {connectionError && (
                <ConnectionErrorDialog
                    isOpen={!!connectionError}
                    errorType={connectionError.type}
                    recommendations={connectionError.recommendations}
                    onClose={handleErrorDialogClose}
                    onRetry={
                        connectionError.type !== ConnectionErrorType.BROWSER_INCOMPATIBLE &&
                            connectionError.type !== ConnectionErrorType.USB_NOT_SUPPORTED
                            ? () => {
                                setConnectionError(null)
                                setShowConnectSteps(true)
                            }
                            : undefined
                    }
                />
            )}
        </>
    )
}

export default KeystoneConnectionPage
