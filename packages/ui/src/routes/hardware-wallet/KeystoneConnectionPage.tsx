import { Devices } from "../../context/commTypes"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import QrContainer from "../../components/qr/qr-reader"
import HardwareWalletSetupLayout from "./SetupLayout"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import classnames from "classnames"
import { Classes } from "../../styles"
import useHardwareWalletConnect from "../../util/hooks/useHardwareWalletConnect"
import { useState } from "react"
import ConnectDeviceStepsLayout from "./ConnectDeviceStepsLayout"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import { DEVICE_CONNECTION_STEPS } from "../../util/connectionStepUtils"

const KeystoneConnectionPage = () => {
    const vendor = Devices.KEYSTONE
    const deviceSteps = DEVICE_CONNECTION_STEPS[vendor]
    const history = useOnMountHistory()

    const { connect, isLoading } = useHardwareWalletConnect(true)
    const [deviceNotReady, setDeviceNotReady] = useState(false)

    const onQRRead = async (qr: string) => {
        const resultOk = await connect(vendor, qr)
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
            <HardwareWalletSetupLayout
                title={"Show keystone QR code"}
                subtitle={""}
                buttons={
                    <>
                        <div className="flex justify-center items-center h-12 w-full">
                            <div>
                                <ButtonWithLoading
                                    label="Cancel"
                                    buttonClass={classnames(
                                        Classes.liteButton,
                                        "h-6"
                                    )}
                                    onClick={() =>
                                        history.push("/hardware-wallet")
                                    }
                                />
                            </div>
                        </div>
                    </>
                }
                childrenClass={"items-center w-3/5"}
                buttonClass={"w-full flex space-x-5"}
            >
                {/* <ConnectDeviceStepsLayout
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
                /> */}

                <QrContainer onRead={onQRRead} />
            </HardwareWalletSetupLayout>
        </>
    )
}

export default KeystoneConnectionPage
