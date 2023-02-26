import { FC } from "react"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import PopupFooter from "../popup/PopupFooter"
import PopupLayout from "../popup/PopupLayout"
import Info from "./Info"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

interface WelcomeInfoProps {
    onDismiss: () => void
}
const WelcomeInfo: FC<WelcomeInfoProps> = ({ onDismiss }) => {
    const history = useOnMountHistory()
    const fromPopupPage = history.location.state?.fromPopUpPage

    return (
        <PopupLayout
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        onClick={
                            !fromPopupPage
                                ? onDismiss
                                : () => history.push("/home")
                        }
                        label="Start Using"
                    />
                </PopupFooter>
            }
        >
            <div className="w-full p-6 pb-0 bg-white bg-opacity-75">
                <Info>
                    <Info.Title>BlockWallet Experimental</Info.Title>
                    <div className="p-1 pt-6">
                        <Info.List>
                            <Info.Item type="warn">
                                This version of BlockWallet is experimental and
                                intended for testing purposes only. Please
                                proceed with caution and read about the intended
                                use{" "}
                                <a
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-300 mt-auto"
                                    href="https://chrome.google.com/webstore/detail/experimental-blockwallet/fhjkaoanopnkfmlahebnoeghlacnimpj"
                                >
                                    here
                                </a>
                                .
                            </Info.Item>
                            <Info.Item type="warn">
                                Some features of the experimental version may be
                                limited or disabled to ensure the safety of your
                                funds.
                            </Info.Item>
                            <Info.Item type="warn">
                                Please use the standard production version of
                                BlockWallet for all regular activities. Download
                                it{" "}
                                <a
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-300 mt-auto"
                                    href="https://chrome.google.com/webstore/detail/blockwallet/bopcbmipnjdcdfflfgjdgdjejmgpoaab"
                                >
                                    here
                                </a>
                                .
                            </Info.Item>
                            <Info.Item type="success" className="m-0 mt-12">
                                We hope you enjoy testing our experimental
                                features!
                            </Info.Item>
                        </Info.List>
                    </div>
                </Info>
            </div>
        </PopupLayout>
    )
}

export default WelcomeInfo
