import { Devices } from "../../context/commTypes"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import ConnectDeviceStepsLayout from "./ConnectDeviceStepsLayout"
import { DEVICE_CONNECTION_STEPS } from "../../util/connectionStepUtils"
import useHardwareWalletConnect, { HardwareWalletError } from "../../util/hooks/useHardwareWalletConnect"
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
    vendor: Devices;
}

const ConnectionErrorDialog: React.FC<ErrorDialogProps> = ({
    isOpen,
    errorType,
    recommendations,
    onClose,
    onRetry,
    vendor
}) => {
    return (
        <WarningDialog
            open={isOpen}
            title={getConnectionErrorMessage(errorType)}
            message={
                <div>
                    <p>
                        We encountered an issue while trying to connect your {vendor} hardware wallet.
                    </p>
                    {recommendations.length > 0 && (
                        <div className="mt-4">
                            <p className="font-semibold mb-2">Try the following:</p>
                            <ul className="list-disc pl-5">
                                {recommendations.map((rec, index) => (
                                    <li key={index} className="mb-1">{rec}</li>
                                ))}
                            </ul>

                            {vendor === Devices.LEDGER && (
                                <p className="mt-3 text-xs italic">
                                    Note: Ledger connections work best in Chrome-based browsers using WebHID.
                                </p>
                            )}
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

const HardwareWalletConnectionPage = () => {
    const history = useOnMountHistory()
    const { connect, isLoading: isConnectLoading, getHardwareWalletErrorMessage, getHardwareWalletErrorRecommendations } = useHardwareWalletConnect()
    const [deviceNotReady, setDeviceNotReady] = useState(false)
    const [browserCompatibility, setBrowserCompatibility] = useState(
        checkHardwareWalletCompatibility()
    )
    const [connectionError, setConnectionError] = useState<{
        type: ConnectionErrorType;
        recommendations: string[];
    } | null>(null)
    const [isLoading, setIsLoading] = useState(false)

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

    // Map hardware wallet errors to connection error types
    const mapToConnectionErrorType = (errorMessage: string): ConnectionErrorType => {
        if (errorMessage === HardwareWalletError.PERMISSION_DENIED) {
            return ConnectionErrorType.PERMISSION_DENIED;
        } else if (errorMessage === HardwareWalletError.CONNECTION_FAILED) {
            return ConnectionErrorType.DEVICE_NOT_READY;
        } else if (errorMessage === HardwareWalletError.BROWSER_INCOMPATIBLE ||
            errorMessage === HardwareWalletError.UNSUPPORTED_BROWSER) {
            return ConnectionErrorType.BROWSER_INCOMPATIBLE;
        }
        return ConnectionErrorType.UNKNOWN_ERROR;
    };

    const onConnect = async () => {
        // If browser is not compatible, show error dialog
        if (!browserCompatibility.isCompatible) {
            setConnectionError({
                type: browserCompatibility.errorType || ConnectionErrorType.BROWSER_INCOMPATIBLE,
                recommendations: browserCompatibility.recommendations.slice(0, 1)
            })
            return
        }

        try {
            // Add loading state feedback for user
            if (vendor === Devices.LEDGER) {
                setIsLoading(true)
                log.debug("Connecting to Ledger device...")
            }

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

            let errorType = ConnectionErrorType.UNKNOWN_ERROR;
            let recommendations: string[] = [];

            // Use our enhanced error handling helpers
            if (error instanceof Error) {
                const errorMessage = error.message;

                // Use the error specific recommendations - limit to one
                if (Object.values(HardwareWalletError).includes(errorMessage as HardwareWalletError)) {
                    const hwError = errorMessage as HardwareWalletError;

                    // Map hardware wallet error to connection error type
                    errorType = mapToConnectionErrorType(hwError);

                    // Get specific recommendations based on error type and device
                    const allRecommendations = getHardwareWalletErrorRecommendations(hwError, vendor);

                    // Get up to 3 recommendations for Ledger, 1 for other devices
                    recommendations = vendor === Devices.LEDGER
                        ? allRecommendations.slice(0, 3)
                        : allRecommendations.slice(0, 1);
                } else if (errorMessage.toLowerCase().includes("permission") ||
                    errorMessage.toLowerCase().includes("denied")) {
                    errorType = ConnectionErrorType.PERMISSION_DENIED;
                    recommendations = ["You denied permission to access the hardware wallet."];
                } else if (errorMessage.toLowerCase().includes("timeout") ||
                    errorMessage.toLowerCase().includes("attempts")) {
                    errorType = ConnectionErrorType.CONNECTION_TIMEOUT;
                    recommendations = [
                        "The connection to your device timed out.",
                        ...(vendor === Devices.LEDGER ? [
                            "Make sure the Ethereum app is open on your Ledger",
                            "Ensure your device is not being used by another application"
                        ] : [])
                    ];
                } else {
                    // Default error handling with device-specific recommendations
                    errorType = ConnectionErrorType.UNKNOWN_ERROR;
                    recommendations = [
                        `Please ensure your ${vendor} device is connected properly and unlocked`,
                        ...(vendor === Devices.LEDGER ? [
                            "Make sure the Ethereum app is open on your Ledger",
                            "Try using a different USB cable or port"
                        ] : [])
                    ];
                }
            }

            setConnectionError({
                type: errorType,
                recommendations
            })
        } finally {
            setIsLoading(false)
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
                isLoading={isLoading || isConnectLoading}
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
                    vendor={vendor}
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
