import { useHistory, useParams } from "react-router-dom"
import { Devices } from "../../context/commTypes"
import ConnectDeviceStepsLayout from "./ConnectDeviceStepsLayout"
import { DEVICE_CONNECTION_STEPS } from "../../util/connectionStepUtils"
import useHardwareWalletConnect from "../../util/hooks/useHardwareWalletConnect"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import { useState, useMemo } from "react"

const HardwareWalletReconnectionPage = () => {
    const history = useHistory()
    //As this flow starts with a redirection from the background, we can't grab the vendor from the history state.
    const { vendor } = useParams() as { vendor: Devices }
    const { connect, isLoading } = useHardwareWalletConnect(true)
    const [deviceNotReady, setDeviceNotReady] = useState(false)

    const deviceSteps = useMemo(() => {
        const deviceSteps = DEVICE_CONNECTION_STEPS[vendor as Devices] || []
        if (!deviceSteps) {
            history.push("/hardware-wallet")
        }
        return deviceSteps
    }, [vendor, history])

    const onConnect = async () => {
        const resultOk = await connect(vendor)
        if (resultOk) {
            history.replace({
                pathname: "/hardware-wallet/success",
                state: { vendor, reconnect: true },
            })
        } else {
            setDeviceNotReady(true)
        }
    }

    return (
        <>
            <ConnectDeviceStepsLayout
                title="Reconnect your device"
                subtitle={`Take these ${deviceSteps.length} steps to reconnect your device.`}
                isLoading={isLoading}
                onConnect={onConnect}
                steps={deviceSteps}
            />
            <HardwareDeviceNotLinkedDialog
                showReconnect={false}
                fullScreen
                vendor={vendor}
                onDone={() => {
                    setDeviceNotReady(false)
                    onConnect()
                }}
                isOpen={deviceNotReady}
            />
        </>
    )
}

export default HardwareWalletReconnectionPage
