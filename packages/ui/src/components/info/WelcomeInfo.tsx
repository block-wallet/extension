import { FC } from "react"
import { LINKS } from "../../util/constants"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import PopupFooter from "../popup/PopupFooter"
import PopupLayout from "../popup/PopupLayout"
import Info from "./Info"
import { useBlankState } from "../../context/background/backgroundHooks"

interface WelcomeInfoProps {
    onDismiss: () => void
}
const WelcomeInfo: FC<WelcomeInfoProps> = ({ onDismiss }) => {
    const { settings } = useBlankState()!

    return (
        <PopupLayout
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        onClick={onDismiss}
                        label="Start Using"
                    />
                </PopupFooter>
            }
        >
            <div className="w-full p-6 pb-0 bg-white bg-opacity-75">
                <Info>
                    <Info.Title>Welcome to BlockWallet!</Info.Title>
                    <div className="p-1 pt-6">
                        <Info.List>
                            {settings.defaultBrowserWallet ? (
                                <Info.Item type="success">
                                    BlockWallet is your default browser wallet
                                    to interact with DApps.
                                </Info.Item>
                            ) : (
                                <Info.Item type="warn">
                                    Set BlockWallet as your default browser
                                    wallet to interact with DApps.
                                </Info.Item>
                            )}

                            <Info.Item type="warn">
                                Select BlockWallet or, alternatively the
                                injected option, to connect with DApps.
                            </Info.Item>
                            <Info.Item type="warn">
                                If you don't see BlockWallet's logo when
                                connecting, select another browser wallet's
                                logo.
                            </Info.Item>
                            <Info.Item type="warn">
                                Join our{" "}
                                <a
                                    target="_blank"
                                    rel="noreferrer"
                                    href={LINKS.TELEGRAM}
                                    className="text-decoration-line: underline; text-primary-blue-default hover:text-primary-blue-hover"
                                >
                                    Telegram group
                                </a>{" "}
                                if you have any questions or feedback.
                            </Info.Item>
                            <Info.Item type="success" className="m-0 mt-16">
                                We hope that you enjoy using the BlockWallet!
                            </Info.Item>
                        </Info.List>
                    </div>
                </Info>
            </div>
        </PopupLayout>
    )
}

export default WelcomeInfo
