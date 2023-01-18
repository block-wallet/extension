import { Devices } from "../../context/commTypes"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import QrContainer from "../../components/qr/qr-reader"
import HardwareWalletSetupLayout from "./SetupLayout"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import classnames from "classnames"
import { Classes } from "../../styles"

const KeystoneConnectionPage = () => {
    const history = useOnMountHistory()

    const vendor = history.location.state.vendor as Devices

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
                <QrContainer />
            </HardwareWalletSetupLayout>
        </>
    )
}

export default KeystoneConnectionPage
