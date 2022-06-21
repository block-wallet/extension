import React, { useReducer, useRef } from "react"
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
    hideAddressWarning: boolean
    hideEstimatedGasExceedsThresholdWarning: boolean
}

const WarningsPreferencesPage = () => {
    const { settings } = useBlankState()!
    const { run, isSuccess, isError, isLoading } = useAsyncInvoke()
    const history = useHistory()

    const initialState = useRef<State>({
        hideAddressWarning: settings.hideAddressWarning,
        hideEstimatedGasExceedsThresholdWarning:
            settings.hideEstimatedGasExceedsThresholdWarning,
    })

    const [warningsConfig, setWarningsConfig] = useReducer(
        mergeReducer<State, any>(),
        initialState.current
    )

    const onSave = async () => {
        run(
            setUserSettings({
                ...settings,
                hideAddressWarning: warningsConfig.hideAddressWarning,
                hideEstimatedGasExceedsThresholdWarning:
                    warningsConfig.hideEstimatedGasExceedsThresholdWarning,
            })
        )
    }
    if (isError) {
        throw new Error("Could not update the address warning configuration.")
    }

    return (
        <PopupLayout
            header={<PopupHeader title="Warnings" close="/" />}
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Save"
                        disabled={deepEqual(
                            warningsConfig,
                            initialState.current
                        )}
                        onClick={onSave}
                        isLoading={isLoading}
                    />
                </PopupFooter>
            }
        >
            <div className="flex flex-col p-6 space-y-6 w-full">
                <span className="text-sm text-gray-500">
                    Warn me when my selected account address is different from
                    transaction's address.
                </span>

                <ToggleButton
                    label="Show Different Addresses Warning"
                    defaultChecked={!warningsConfig.hideAddressWarning}
                    onToggle={(value) =>
                        setWarningsConfig({
                            hideAddressWarning: !value,
                        })
                    }
                />

                <hr />
                <span className="text-sm text-gray-500">
                    Warn me when a dApp suggests fees much lower/higher than
                    recommended.
                </span>
                <ToggleButton
                    id="gasWarning"
                    //inputName="gasWarning"
                    label="Show Gas Price Warning"
                    defaultChecked={
                        !warningsConfig.hideEstimatedGasExceedsThresholdWarning
                    }
                    onToggle={(value) =>
                        setWarningsConfig({
                            hideEstimatedGasExceedsThresholdWarning: !value,
                        })
                    }
                />
            </div>
            <SuccessDialog
                open={isSuccess}
                title="Warnings"
                timeout={800}
                message="Your changes have been succesfully saved!"
                onDone={history.goBack}
            />
        </PopupLayout>
    )
}

export default WarningsPreferencesPage
