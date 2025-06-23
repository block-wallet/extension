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
import { BsGlobe2, BsInfoCircle, BsShield } from "react-icons/bs"

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
            submitOnEnter={{ onSubmit: isWelcome ? onNext : onSave }}
        >
            <div className="flex flex-col p-6 space-y-6 w-full">
                {/* Information Panel */}
                <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-gray-700">
                    <div className="flex items-start space-x-3">
                        <BsGlobe2 className="text-blue-600 dark:text-blue-400 text-lg mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-base font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                Browser Wallet Integration
                            </h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Control how BlockWallet interacts with decentralized applications (DApps)
                                when multiple browser wallets are installed.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Current Status */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Current Status:
                        </span>
                        <span className={`text-sm font-semibold ${wasDefaultBrowserWallet
                            ? "text-green-600 dark:text-green-400"
                            : "text-orange-600 dark:text-orange-400"
                            }`}>
                            {wasDefaultBrowserWallet ? "Enabled" : "Disabled"}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {wasDefaultBrowserWallet ? (
                            "BlockWallet is set as your default browser wallet."
                        ) : (
                            "BlockWallet is not set as your default browser wallet."
                        )}
                    </p>
                </div>

                {/* Toggle Section */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                Default Browser Wallet
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Enable this to make BlockWallet your primary wallet for DApp connections
                            </p>
                        </div>
                        <ToggleButton
                            label="Set as Default Browser Wallet"
                            defaultChecked={defaultBrowserWallet}
                            onToggle={setDefaultBrowserWallet}
                        />
                    </div>
                </div>

                {/* Explanation Section */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <BsInfoCircle className="text-blue-500 dark:text-blue-400 text-lg mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    How This Works
                                </h4>
                                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                    {defaultBrowserWallet ? (
                                        <div className="space-y-2">
                                            <p>
                                                <span className="font-medium text-green-600 dark:text-green-400">When enabled:</span>
                                                {" "}BlockWallet will automatically connect to DApps by default,
                                                giving you seamless access to decentralized applications.
                                            </p>
                                            <p>
                                                If you have multiple wallets installed, BlockWallet will take
                                                priority for new DApp connections.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p>
                                                <span className="font-medium text-orange-600 dark:text-orange-400">When disabled:</span>
                                                {" "}BlockWallet will not automatically connect to DApps if you have
                                                other browser wallets installed.
                                            </p>
                                            <p>
                                                Choose this option if you prefer to use a different wallet
                                                as your primary DApp connector.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Important Notice */}
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start space-x-3">
                        <BsShield className="text-amber-600 dark:text-amber-400 text-lg mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                                Important Notes
                            </h4>
                            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                                <p>• You can change this setting at any time</p>
                                <p>• DApp pages need to be refreshed for changes to take effect</p>
                                <p>• This setting only affects new DApp connections</p>
                            </div>
                        </div>
                    </div>
                </div>

                <SuccessDialog
                    open={isSuccess}
                    title="Default Browser Wallet"
                    timeout={800}
                    message="Your changes have been successfully saved!"
                    onDone={
                        isWelcome
                            ? dismissDefaultWalletPreferences
                            : history.goBack
                    }
                />
            </div>
        </PopupLayout>
    )
}

export default DefaultWalletPreferencesPage
