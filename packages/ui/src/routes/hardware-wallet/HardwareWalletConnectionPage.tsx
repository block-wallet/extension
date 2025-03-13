import { Devices } from "../../context/commTypes"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import ConnectDeviceStepsLayout from "./ConnectDeviceStepsLayout"
import { DEVICE_CONNECTION_STEPS } from "../../util/connectionStepUtils"
import useHardwareWalletConnect from "../../util/hooks/useHardwareWalletConnect"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import { useEffect, useState } from "react"
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

const HardwareWalletConnectionPage = () => {
    const history = useOnMountHistory()
    const { connect, isLoading } = useHardwareWalletConnect()
    const [deviceNotReady, setDeviceNotReady] = useState(false)
    const [browserCompatibility, setBrowserCompatibility] = useState(
        checkHardwareWalletCompatibility()
    )
    const [connectionError, setConnectionError] = useState<{
        type: ConnectionErrorType;
        recommendations: string[];
    } | null>(null)

    const vendor = history.location.state.vendor as Devices
    const deviceSteps = DEVICE_CONNECTION_STEPS[vendor]

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

    const onConnect = async () => {
        // If browser is not compatible, show error dialog
        if (!browserCompatibility.isCompatible) {
            setConnectionError({
                type: browserCompatibility.errorType || ConnectionErrorType.BROWSER_INCOMPATIBLE,
                recommendations: browserCompatibility.recommendations
            })
            return
        }

        try {
            const resultOk = await connect(vendor)
            if (resultOk) {
                history.push({
                    pathname: "/hardware-wallet/accounts",
                    state: { vendor },
                })
            } else {
                // Device connection failed
                setDeviceNotReady(true)
            }
        } catch (error) {
            log.error("Hardware wallet connection error:", error)

            // Determine error type based on error message
            let errorType = ConnectionErrorType.UNKNOWN_ERROR
            let recommendations = [
                "Please ensure your device is connected properly and unlocked.",
                "Try disconnecting and reconnecting your device."
            ]

            if (error instanceof Error) {
                const errorMessage = error.message.toLowerCase()

                if (errorMessage.includes("permission") || errorMessage.includes("denied")) {
                    errorType = ConnectionErrorType.PERMISSION_DENIED
                    recommendations = [
                        "You denied permission to access the hardware wallet.",
                        "Please try again and allow access when prompted."
                    ]
                } else if (errorMessage.includes("timeout")) {
                    errorType = ConnectionErrorType.CONNECTION_TIMEOUT
                    recommendations = [
                        "The connection to your device timed out.",
                        "Please ensure your device is unlocked and try again."
                    ]
                }
            }

            setConnectionError({
                type: errorType,
                recommendations
            })
        }
    }

    const handleErrorDialogClose = () => {
        setConnectionError(null)

        // If the error is browser incompatibility, go back
        if (connectionError?.type === ConnectionErrorType.BROWSER_INCOMPATIBLE ||
            connectionError?.type === ConnectionErrorType.USB_NOT_SUPPORTED) {
            history.goBack()
        }
    }

    return (
        <>
            <ConnectDeviceStepsLayout
                title="Before We Get Started"
                subtitle={`Make sure you complete these ${deviceSteps.length} steps before you continue.`}
                isLoading={isLoading}
                onConnect={onConnect}
                steps={deviceSteps}
            />

            {/* Device not ready dialog */}
            <HardwareDeviceNotLinkedDialog
                showReconnect={false}
                fullScreen
                vendor={vendor}
                onDone={() => {
                    setDeviceNotReady(false)
                    onConnect()
                }}
                isOpen={deviceNotReady && !connectionError}
                useClickOutside={false}
                cancelButton={true}
                onCancel={() => setDeviceNotReady(false)}
            />

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
                                onConnect()
                            }
                            : undefined
                    }
                />
            )}
        </>
    )
}

export default HardwareWalletConnectionPage
