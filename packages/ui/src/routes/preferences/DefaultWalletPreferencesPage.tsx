import { useState, FC } from "react"
import { useHistory } from "react-router-dom"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import ToggleButton from "../../components/button/ToggleButton"
import SuccessDialog from "../../components/dialog/SuccessDialog"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useBlankState } from "../../context/background/backgroundHooks"
import { toggleDefaultBrowserWallet } from "../../context/commActions"
import useAsyncInvoke from "../../util/hooks/useAsyncInvoke"

interface DefaultWalletPreferencesProps {
    isWelcome?: boolean
    dismissDefaultWalletPreferences: () => void
}

const DefaultWalletPreferencesPage: FC<DefaultWalletPreferencesProps> = ({
    isWelcome, // if component was entered before welcome message
    dismissDefaultWalletPreferences,
}) => {
    const { settings } = useBlankState()!
    const history = useHistory()
    const { run, isSuccess, isError } = useAsyncInvoke()
    const [defaultBrowserWallet, setDefaultBrowserWallet] = useState<boolean>(
        settings.defaultBrowserWallet
    )
    const wasDefaultBrowserWallet = settings.defaultBrowserWallet

    const onSave = async () => {
        run(toggleDefaultBrowserWallet(defaultBrowserWallet))
    }

    const onNext = async () => {
        if (isDirty) {
            run(toggleDefaultBrowserWallet(defaultBrowserWallet))
        } else {
            dismissDefaultWalletPreferences()
        }
    }

    if (isError) {
        throw new Error("Could not toggle default browser wallet")
    }

    const isDirty = defaultBrowserWallet !== settings.defaultBrowserWallet

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Default Browser Wallet"
                    backButton={!isWelcome}
                    close={isWelcome ? false : "/"}
                    onBack={() =>
                        !isWelcome && history.push("/settings/preferences")
                    }
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label={isWelcome ? "Next" : "Save"}
                        disabled={isWelcome ? false : !isDirty}
                        onClick={isWelcome ? onNext : onSave}
                    />
                </PopupFooter>
            }
        >
            <div className="flex flex-col p-6 space-y-6 w-full">
                <div className="text-sm text-gray-500">
                    {wasDefaultBrowserWallet ? (
                        <span>
                            BlockWallet is set as your default browser wallet.
                        </span>
                    ) : (
                        <span>
                            BlockWallet is not set as your default browser
                            wallet.
                        </span>
                    )}
                </div>

                <SuccessDialog
                    open={isSuccess}
                    title="Default Browser Wallet"
                    timeout={800}
                    message="Your changes have been succesfully saved!"
                    onDone={
                        isWelcome
                            ? dismissDefaultWalletPreferences
                            : history.goBack
                    }
                />

                <ToggleButton
                    label="Default Browser Wallet"
                    defaultChecked={defaultBrowserWallet}
                    onToggle={setDefaultBrowserWallet}
                />

                <div className="text-sm text-gray-500">
                    {wasDefaultBrowserWallet ? (
                        <span>
                            Turning this off will make BlockWallet unable to
                            connect to DApps in case you have more than one
                            wallet installed in your browser. Turn it off if you
                            want a different browser wallet to connect to the
                            DApps you are visiting.
                        </span>
                    ) : (
                        <span>
                            Turning this on will make BlockWallet connect to
                            DApps by default. Turn it on if you want to use
                            BlockWallet to connect to DApps, instead of other
                            browser wallets.
                        </span>
                    )}
                    <br />
                    <br />

                    <span>
                        You can change this setting at any time. Be aware that
                        you need to refresh any DApp pages you might be on, for
                        these changes to take affect.
                    </span>
                </div>
            </div>
        </PopupLayout>
    )
}

export default DefaultWalletPreferencesPage
