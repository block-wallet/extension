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

// Add INFO to ConnectionErrorType if it doesn't exist
const INFO_ERROR_TYPE = "INFO" as unknown as ConnectionErrorType;

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

    // Add this effect to check for existing connection status
    useEffect(() => {
        // Only run for Ledger devices
        if (vendor !== Devices.LEDGER) return;

        // Check if we have a connection status stored
        const checkConnectionStatus = async () => {
            try {
                // Try to access chrome.storage.session (MV3)
                if (chrome.storage && chrome.storage.session) {
                    const result = await chrome.storage.session.get('ledger_connection_status');

                    if (result.ledger_connection_status &&
                        result.ledger_connection_status.connected &&
                        // Check if the connection is recent (last 5 minutes)
                        Date.now() - result.ledger_connection_status.timestamp < 5 * 60 * 1000) {

                        log.debug("Found valid Ledger connection status, navigating to accounts page");

                        // Navigate to accounts page
                        history.push({
                            pathname: "/hardware-wallet/accounts",
                            state: { vendor },
                        });

                        // Clear the status to prevent multiple redirects
                        await chrome.storage.session.remove('ledger_connection_status');
                    }
                }
            } catch (e) {
                log.error("Error checking Ledger connection status:", e);
            }
        };

        checkConnectionStatus();
    }, [vendor, history]);

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
        setIsLoading(true);
        log.debug(`Attempting to connect to ${vendor} device...`);

        // Clear any previous errors
        setConnectionError(null);

        try {
            // For Ledger specifically, first check if HID is supported and if any devices are already connected
            if (vendor === Devices.LEDGER && navigator.hid) {
                let existingDevicesFound = false;

                try {
                    log.debug("Checking for existing HID devices before connection attempt");
                    const devices = await navigator.hid.getDevices();
                    const ledgerDevices = devices.filter(device => device.vendorId === 0x2c97);

                    if (ledgerDevices.length > 0) {
                        log.debug(`Found ${ledgerDevices.length} existing Ledger devices`);
                        existingDevicesFound = true;

                        // Log device details for debugging
                        ledgerDevices.forEach((device, index) => {
                            log.debug(`Ledger device ${index + 1}: vendorId=0x${device.vendorId.toString(16)}, productId=0x${device.productId.toString(16)}, productName=${device.productName || 'Unknown'}, opened=${device.opened}`);
                        });
                    }
                } catch (e) {
                    log.warn("Error checking existing HID devices:", e);
                }

                // For Ledger, always show the instruction dialog before connection
                log.debug("Showing pre-connection instructions for Ledger");
                setConnectionError({
                    type: INFO_ERROR_TYPE,
                    recommendations: [
                        "Connect your Ledger device to your computer",
                        "Unlock your Ledger using your PIN",
                        "Open the Ethereum application on your device",
                        "When prompted, allow BlockWallet to connect to your device"
                    ]
                });

                // Give the user a moment to read instructions before initiating connection
                await new Promise(resolve => setTimeout(resolve, 2500));

                // Clear instructions before attempting connection
                setConnectionError(null);
            }

            // Attempt the connection
            log.debug(`Executing connection for ${vendor}...`);
            const result = await connect(vendor);
            setIsLoading(false);

            if (result) {
                // Successfully connected, navigate to accounts page
                log.info(`Successfully connected to ${vendor} device`);

                // Store connection success in session storage for Ledger (to handle service worker restarts)
                if (vendor === Devices.LEDGER && chrome.storage && chrome.storage.session) {
                    try {
                        await chrome.storage.session.set({
                            'ledger_connection_status': {
                                connected: true,
                                timestamp: Date.now()
                            }
                        });
                        log.debug("Stored Ledger connection success in session storage");
                    } catch (storageError) {
                        log.warn("Could not store Ledger connection status:", storageError);
                    }
                }

                history.push({
                    pathname: "/hardware-wallet/accounts",
                    state: { vendor },
                });
            } else {
                // Connection failed with general error
                log.warn(`Device connection failed for ${vendor} with no specific error`);
                setDeviceNotReady(true);
            }
        } catch (error) {
            setIsLoading(false);
            log.error(`Error connecting to ${vendor}:`, error);

            // Get detailed error message and recommendations
            const errorMessage = getHardwareWalletErrorMessage(error.message);
            const recommendations = getHardwareWalletErrorRecommendations(error.message, vendor);

            // Adding specific troubleshooting tips for Ledger devices
            if (vendor === Devices.LEDGER) {
                recommendations.push(
                    "Make sure the Ethereum application is open on your Ledger",
                    "Try using the 'Connect to USB Device' prompt when it appears",
                    "If connection fails repeatedly, try disconnecting and reconnecting your device"
                );

                // Check if this is a timeout error and offer specific advice
                if (error.message.includes('timeout')) {
                    recommendations.push(
                        "Connection timeout usually means the Ethereum app is not open on your device",
                        "Open the Ethereum app and try again"
                    );
                } else if (error.message.includes('denied') || error.message.includes('permission')) {
                    recommendations.push(
                        "You must approve the connection request in your browser",
                        "Check for a device selection dialog that may be hidden"
                    );
                }
            }

            // Map to connection error type and show dialog
            setConnectionError({
                type: mapToConnectionErrorType(errorMessage),
                recommendations: recommendations
            });
        }
    };

    // Add a new retry connection function
    const retryConnection = async () => {
        setConnectionError(null);

        // For Ledger devices, try to clear any existing HID connections first
        if (vendor === Devices.LEDGER && navigator.hid) {
            try {
                log.debug("Checking for existing HID device connections before retry");
                const devices = await navigator.hid.getDevices();
                const ledgerDevices = devices.filter(device => device.vendorId === 0x2c97);

                log.debug(`Found ${ledgerDevices.length} Ledger devices for reset`);

                for (const device of ledgerDevices) {
                    try {
                        if (device.opened) {
                            log.debug(`Closing previously opened Ledger connection: ${device.productName || 'Unknown'}`);
                            await device.close();
                        }
                    } catch (e) {
                        log.warn("Error closing device:", e);
                    }
                }
            } catch (e) {
                log.warn("Error checking HID devices:", e);
            }
        }

        // Wait a brief moment after closing connections
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Attempt connection again
        onConnect();
    };

    const handleErrorDialogClose = () => {
        setConnectionError(null);
        // Return to hardware wallets screen
        history.push({
            pathname: "/hardware-wallet",
        });
    };

    return (
        <>
            <HardwareDeviceNotLinkedDialog
                fullScreen
                vendor={vendor}
                onDone={() => setDeviceNotReady(false)}
                isOpen={deviceNotReady}
            />

            {connectionError && (
                <ConnectionErrorDialog
                    isOpen={!!connectionError}
                    errorType={connectionError.type}
                    recommendations={connectionError.recommendations}
                    onClose={handleErrorDialogClose}
                    onRetry={
                        // Only show retry button for errors that might be fixed by retrying
                        connectionError.type !== ConnectionErrorType.BROWSER_INCOMPATIBLE
                            ? retryConnection
                            : undefined
                    }
                    vendor={vendor}
                />
            )}

            <ConnectDeviceStepsLayout
                title={`Connect your ${vendor}`}
                subtitle={vendor === Devices.LEDGER
                    ? "Unlock your Ledger device and open the Ethereum app"
                    : `Follow these steps to connect your ${vendor} wallet`}
                isLoading={isLoading}
                onConnect={onConnect}
                steps={deviceSteps}
            />
        </>
    );
}

export default HardwareWalletConnectionPage
