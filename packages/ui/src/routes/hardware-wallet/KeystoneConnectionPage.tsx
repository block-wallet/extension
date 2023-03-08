import { Devices } from "../../context/commTypes"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import QrContainer from "../../components/qr/QRReader"
import HardwareWalletSetupLayout from "./SetupLayout"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import classnames from "classnames"
import { Classes } from "../../styles"
import useHardwareWalletConnect from "../../util/hooks/useHardwareWalletConnect"
import { useState } from "react"

const KeystoneConnectionPage = () => {
    const vendor = Devices.KEYSTONE
    const history = useOnMountHistory()

    const { connect } = useHardwareWalletConnect(true)
    const [deviceNotReady, setDeviceNotReady] = useState(false)

    const onQRRead = async (qr: string) => {
        const resultOk = await connect(vendor, qr)
        if (resultOk) {
            setDeviceNotReady(resultOk)
            history.push({
                pathname: "/hardware-wallet/accounts",
                state: { vendor },
            })
        }
        return resultOk
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
                <QrContainer
                    onRead={onQRRead}
                    deviceNotReady={deviceNotReady}
                />
            </HardwareWalletSetupLayout>
        </>
    )
}

export default KeystoneConnectionPage
