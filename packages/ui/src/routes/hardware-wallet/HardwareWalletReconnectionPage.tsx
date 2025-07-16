import { useHistory, useParams } from "react-router-dom"
import { Devices } from "../../context/commTypes"
import ConnectDeviceStepsLayout from "./ConnectDeviceStepsLayout"
import { DEVICE_CONNECTION_STEPS } from "../../util/connectionStepUtils"
import useHardwareWalletConnect from "../../util/hooks/useHardwareWalletConnect"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import { useState, useMemo, useEffect } from "react"
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
                <div className="text-gray-900 dark:text-gray-100">
                    <p className="pb-3 text-gray-700 dark:text-gray-300">
                        We encountered an issue while trying to connect your hardware wallet.
                    </p>
                    {recommendations.length > 0 && (
                        <div className="mt-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                            <p className="font-semibold mb-3 text-amber-800 dark:text-amber-200">
                                💡 Try the following steps:
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                {recommendations.map((recommendation, index) => (
                                    <li key={index} className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                        {recommendation}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
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

const HardwareWalletReconnectionPage = () => {
    const history = useHistory()
    //As this flow starts with a redirection from the background, we can't grab the vendor from the history state.
    const { vendor } = useParams() as { vendor: Devices }
    const { connect, isLoading } = useHardwareWalletConnect(true)
    const [deviceNotReady, setDeviceNotReady] = useState(false)
    const [browserCompatibility, setBrowserCompatibility] = useState(
        checkHardwareWalletCompatibility()
    )
    const [connectionError, setConnectionError] = useState<{
        type: ConnectionErrorType;
        recommendations: string[];
    } | null>(null)

    const deviceSteps = useMemo(() => {
        const deviceSteps = DEVICE_CONNECTION_STEPS[vendor as Devices] || []
        if (!deviceSteps) {
            history.push("/hardware-wallet")
        }
        return deviceSteps
    }, [vendor, history])

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
                history.replace({
                    pathname: "/hardware-wallet/success",
                    state: { vendor, reconnect: true },
                })
            } else {
                // Device connection failed
                setDeviceNotReady(true)
            }
        } catch (error) {
            log.error("Hardware wallet reconnection error:", error)

            // Determine error type based on error message
            let errorType = ConnectionErrorType.UNKNOWN_ERROR
            let recommendations = [`Please ensure your ${vendor} device is connected properly and unlocked.`]

            if (error instanceof Error) {
                const errorMessage = error.message.toLowerCase()

                if (errorMessage.includes("permission") || errorMessage.includes("denied")) {
                    errorType = ConnectionErrorType.PERMISSION_DENIED
                    recommendations = ["You denied permission to access the hardware wallet."]
                } else if (errorMessage.includes("timeout")) {
                    errorType = ConnectionErrorType.CONNECTION_TIMEOUT
                    recommendations = ["The connection to your device timed out."]
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
                title="Reconnect Your Device"
                subtitle={`Make sure you complete these ${deviceSteps.length} steps before you continue.`}
                isLoading={isLoading}
                onConnect={onConnect}
                steps={deviceSteps}
            />

            {/* Device not ready dialog */}
            <HardwareDeviceNotLinkedDialog
                showReconnect={false}
                fullScreen
                vendor={vendor as Devices}
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

export default HardwareWalletReconnectionPage
