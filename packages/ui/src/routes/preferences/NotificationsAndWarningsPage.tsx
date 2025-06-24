import { useReducer, useRef } from "react"
import { useHistory } from "react-router-dom"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import ToggleButton from "../../components/button/ToggleButton"
import SuccessDialog from "../../components/dialog/SuccessDialog"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useBlankState } from "../../context/background/backgroundHooks"
import { setUserSettings } from "../../context/commActions"
import useAsyncInvoke from "../../util/hooks/useAsyncInvoke"
import { deepEqual } from "../../util/objectUtils"
import { mergeReducer } from "../../util/reducerUtils"
import { BsBell, BsShield, BsExclamationTriangle, BsInfoCircle, BsGear } from "react-icons/bs"

interface State {
    subscribedToNotifications: boolean
    hideAddressWarning: boolean
    hideSendToContractWarning: boolean
    hideSendToNullWarning: boolean
    hideEstimatedGasExceedsThresholdWarning: boolean
    hideBridgeInsufficientNativeTokenWarning: boolean
}

const NotificationsAndWarningsPage = () => {
    const { settings } = useBlankState()!
    const { run, isSuccess, isError, isLoading } = useAsyncInvoke()
    const history = useHistory()

    const initialState = useRef<State>({
        subscribedToNotifications: settings.subscribedToNotifications,
        hideAddressWarning: settings.hideAddressWarning,
        hideSendToContractWarning: settings.hideSendToContractWarning,
        hideSendToNullWarning: settings.hideSendToNullWarning,
        hideEstimatedGasExceedsThresholdWarning:
            settings.hideEstimatedGasExceedsThresholdWarning,
        hideBridgeInsufficientNativeTokenWarning:
            settings.hideBridgeInsufficientNativeTokenWarning,
    })

    const [preferencesConfig, setPreferencesConfig] = useReducer(
        mergeReducer<State, any>(),
        initialState.current
    )

    const onSave = async () => {
        run(
            setUserSettings({
                ...settings,
                subscribedToNotifications:
                    preferencesConfig.subscribedToNotifications,
                hideAddressWarning: preferencesConfig.hideAddressWarning,
                hideSendToContractWarning:
                    preferencesConfig.hideSendToContractWarning,
                hideSendToNullWarning: preferencesConfig.hideSendToNullWarning,
                hideEstimatedGasExceedsThresholdWarning:
                    preferencesConfig.hideEstimatedGasExceedsThresholdWarning,
                hideBridgeInsufficientNativeTokenWarning:
                    preferencesConfig.hideBridgeInsufficientNativeTokenWarning,
            })
        )
    }

    if (isError) {
        throw new Error(
            "Could not update the address notifications and warning configuration."
        )
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Notifications & Warnings"
                    close="/"
                    onBack={() => history.push("/settings/preferences")}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Save"
                        disabled={deepEqual(
                            preferencesConfig,
                            initialState.current
                        )}
                        onClick={onSave}
                        isLoading={isLoading}
                    />
                </PopupFooter>
            }
        >
            <div className="flex flex-col p-6 space-y-6 w-full">
                {/* Information Panel */}
                <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-gray-700">
                    <div className="flex items-start space-x-3">
                        <BsGear className="text-blue-600 dark:text-blue-400 text-lg mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-base font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                Safety & Notification Settings
                            </h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Configure browser notifications and security warnings to protect your assets
                                and stay informed about important wallet events.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Browser Notifications Section */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <BsBell className="text-blue-500 dark:text-blue-400 text-lg mt-0.5 flex-shrink-0" />
                            <div className="flex-grow">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    Browser Notifications
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Receive BlockWallet's browser notifications for transaction confirmations,
                                    security alerts, and important updates.
                                </p>
                                <ToggleButton
                                    id="notifications"
                                    label="Enable Browser Notifications"
                                    defaultChecked={preferencesConfig.subscribedToNotifications}
                                    onToggle={(value) =>
                                        setPreferencesConfig({
                                            subscribedToNotifications: value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction Security Warnings */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <BsShield className="text-green-500 dark:text-green-400 text-lg mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    Transaction Security Warnings
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Security warnings help prevent accidental loss of funds by alerting you
                                    to potentially risky transaction patterns.
                                </p>
                            </div>
                        </div>

                        {/* Smart Contract Warning */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                        Smart Contract Address Warning
                                    </h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                        Warns when sending tokens to smart contract addresses, which may not accept direct transfers.
                                    </p>
                                </div>
                                <ToggleButton
                                    id="smartContractWarning"
                                    label="Show Smart Contract Warning"
                                    defaultChecked={!preferencesConfig.hideSendToContractWarning}
                                    onToggle={(value) =>
                                        setPreferencesConfig({
                                            hideSendToContractWarning: !value,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        {/* Null Address Warning */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                        Null Address Warning
                                    </h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                        Warns when sending tokens to the null address (0x0...0), which permanently burns the tokens.
                                    </p>
                                </div>
                                <ToggleButton
                                    id="nullAddressWarning"
                                    label="Show Null Address Warning"
                                    defaultChecked={!preferencesConfig.hideSendToNullWarning}
                                    onToggle={(value) =>
                                        setPreferencesConfig({
                                            hideSendToNullWarning: !value,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        {/* Different Address Warning */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                        Account Mismatch Warning
                                    </h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                        Warns when your selected account differs from the transaction's from address.
                                    </p>
                                </div>
                                <ToggleButton
                                    id="addressWarning"
                                    label="Show Different Addresses Warning"
                                    defaultChecked={!preferencesConfig.hideAddressWarning}
                                    onToggle={(value) =>
                                        setPreferencesConfig({
                                            hideAddressWarning: !value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gas & Network Warnings */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <BsExclamationTriangle className="text-amber-500 dark:text-amber-400 text-lg mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    Gas & Network Warnings
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Alerts for gas fee anomalies and cross-chain transaction requirements.
                                </p>
                            </div>
                        </div>

                        {/* Gas Price Warning */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                        Gas Price Warning
                                    </h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                        Warns when DApps suggest gas fees significantly higher or lower than recommended levels.
                                    </p>
                                </div>
                                <ToggleButton
                                    id="gasWarning"
                                    label="Show Gas Price Warning"
                                    defaultChecked={!preferencesConfig.hideEstimatedGasExceedsThresholdWarning}
                                    onToggle={(value) =>
                                        setPreferencesConfig({
                                            hideEstimatedGasExceedsThresholdWarning: !value,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        {/* Bridge Warning */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                        Bridge Insufficient Funds Warning
                                    </h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                        Warns when you don't have enough native tokens in the destination network to cover gas fees.
                                    </p>
                                </div>
                                <ToggleButton
                                    id="bridgeNativeTokenWarning"
                                    label="Show Bridging Warning"
                                    defaultChecked={!preferencesConfig.hideBridgeInsufficientNativeTokenWarning}
                                    onToggle={(value) =>
                                        setPreferencesConfig({
                                            hideBridgeInsufficientNativeTokenWarning: !value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Important Notice */}
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start space-x-3">
                        <BsInfoCircle className="text-amber-600 dark:text-amber-400 text-lg mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                                Security Recommendation
                            </h4>
                            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                                <p>• Keep security warnings enabled for maximum protection</p>
                                <p>• Browser notifications help you stay informed about important events</p>
                                <p>• You can always disable specific warnings if they become intrusive</p>
                                <p>• These settings only affect warning displays, not transaction functionality</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <SuccessDialog
                open={isSuccess}
                title="Notifications & Warnings"
                timeout={800}
                message="Your changes have been successfully saved!"
                onDone={history.goBack}
            />
        </PopupLayout>
    )
}

export default NotificationsAndWarningsPage
