import React from "react"
import { Devices } from "../../context/commTypes"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import ConnectDeviceStepsLayout from "./ConnectDeviceStepsLayout"
import { DEVICE_CONNECTION_STEPS } from "../../util/connectionStepUtils"
import useHardwareWalletConnect from "../../util/hooks/useHardwareWalletConnect"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"

const HardwareWalletConnectionPage = () => {
    const history = useOnMountHistory()
    const { connect, isLoading } = useHardwareWalletConnect()
    const [deviceNotReady, setDeviceNotReady] = React.useState(false)

    const vendor = history.location.state.vendor as Devices

    const deviceSteps = DEVICE_CONNECTION_STEPS[vendor]

    const onConnect = async () => {
        const resultOk = await connect(vendor)
        if (resultOk) {
            history.push({
                pathname: "/hardware-wallet/accounts",
                state: { vendor },
            })
        } else {
            setDeviceNotReady(true)
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
            <HardwareDeviceNotLinkedDialog
                showReconnect={false}
                fullScreen
                vendor={vendor}
                onDone={() => {
                    setDeviceNotReady(false)
                    onConnect()
                }}
                isOpen={deviceNotReady}
                useClickOutside={false}
                cancelButton={true}
                onCancel={() => setDeviceNotReady(false)}
            />
        </>
    )
}

export default HardwareWalletConnectionPage
