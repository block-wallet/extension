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
                <span className="text-sm text-primary-grey-dark">
                    Receive BlockWallet's browser notifications.
                </span>

                <ToggleButton
                    id="notifications"
                    label="Show Browser Notifications"
                    defaultChecked={preferencesConfig.subscribedToNotifications}
                    onToggle={(value) =>
                        setPreferencesConfig({
                            subscribedToNotifications: value,
                        })
                    }
                />
                <hr />
                <span className="text-sm text-primary-grey-dark">
                    Warn me when I try to send tokens to a smart contract
                    address
                </span>
                <ToggleButton
                    id="smartContractWarning"
                    label="Show Smart Contract Warning"
                    defaultChecked={
                        !preferencesConfig.hideSendToContractWarning
                    }
                    onToggle={(value) =>
                        setPreferencesConfig({
                            hideSendToContractWarning: !value,
                        })
                    }
                />
                <hr />
                <span className="text-sm text-primary-grey-dark">
                    Warn me when I try to send tokens to the null address
                </span>
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

                <hr />
                <span className="text-sm text-primary-grey-dark">
                    Warn me when my selected account address is different from
                    transaction's address.
                </span>

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

                <hr />
                <span className="text-sm text-primary-grey-dark">
                    Warn me when a dApp suggests fees much lower/higher than
                    recommended.
                </span>
                <ToggleButton
                    id="gasWarning"
                    label="Show Gas Price Warning"
                    defaultChecked={
                        !preferencesConfig.hideEstimatedGasExceedsThresholdWarning
                    }
                    onToggle={(value) =>
                        setPreferencesConfig({
                            hideEstimatedGasExceedsThresholdWarning: !value,
                        })
                    }
                />

                <hr />
                <span className="text-sm text-primary-grey-dark">
                    Warn me when I haven't enough funds in the destination
                    network of a bridge
                </span>
                <ToggleButton
                    id="bridgeNativeTokenWarning"
                    label="Show Bridging Warning"
                    defaultChecked={
                        !preferencesConfig.hideBridgeInsufficientNativeTokenWarning
                    }
                    onToggle={(value) =>
                        setPreferencesConfig({
                            hideBridgeInsufficientNativeTokenWarning: !value,
                        })
                    }
                />
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
