import { useState } from "react"
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

const KeystoneConnectionPage = () => {
    const vendor = Devices.KEYSTONE
    const history = useOnMountHistory()
    const { connect } = useHardwareWalletConnect(true)
    const [deviceNotReady, setDeviceNotReady] = useState(false)
    const deviceSteps = DEVICE_CONNECTION_STEPS[vendor]
    const [showConnectSteps, setShowConnectSteps] = useState(true)

    const onQRRead = async (ur: URParameter) => {
        const resultOk = await connect(vendor, ur)
        if (resultOk) {
            setDeviceNotReady(resultOk)
            history.push({
                pathname: "/hardware-wallet/accounts",
                state: { vendor },
            })
        }
        return resultOk
    }

    return showConnectSteps ? (
        <ConnectDeviceStepsLayout
            title="Before We Get Started"
            subtitle={`Make sure you complete these ${deviceSteps.length} steps before you continue.`}
            isLoading={false}
            onConnect={() => setShowConnectSteps(false)}
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
                            // location="/hardware-wallet"
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
    )
}

export default KeystoneConnectionPage
