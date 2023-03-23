import { useState } from "react"
import { useHistory } from "react-router-dom"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import ToggleButton from "../../components/button/ToggleButton"
import SuccessDialog from "../../components/dialog/SuccessDialog"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useBlankState } from "../../context/background/backgroundHooks"
import { toggleReleaseNotesSubscription } from "../../context/commActions"
import useAsyncInvoke from "../../util/hooks/useAsyncInvoke"

const ReleaseNotesPreferencesPage = () => {
    const { settings } = useBlankState()!
    const { run, isSuccess, isError, isLoading } = useAsyncInvoke()
    const history = useHistory()
    const [subscribedReleaseNotes, setSubscribedToReleaseNotes] =
        useState<boolean>(settings.subscribedToReleaseaNotes)

    const onSave = async () => {
        run(toggleReleaseNotesSubscription(subscribedReleaseNotes))
    }

    if (isError) {
        throw new Error("Could not update release notes subscription")
    }
    const isDirty =
        subscribedReleaseNotes !== settings.subscribedToReleaseaNotes
    return (
        <PopupLayout
            header={<PopupHeader title="Release Notes" close="/" />}
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Save"
                        disabled={!isDirty}
                        onClick={onSave}
                        isLoading={isLoading}
                    />
                </PopupFooter>
            }
        >
            <div className="flex flex-col p-6 space-y-6 w-full">
                <span className="text-sm text-primary-grey-dark">
                    Be up-to-date with latest BlockWallet news.
                </span>
                <SuccessDialog
                    open={isSuccess}
                    title="Release Notes"
                    timeout={800}
                    message="Your changes have been succesfully saved!"
                    onDone={history.goBack}
                />
                <ToggleButton
                    label="Show Release Notes"
                    defaultChecked={subscribedReleaseNotes}
                    onToggle={setSubscribedToReleaseNotes}
                />
            </div>
        </PopupLayout>
    )
}

export default ReleaseNotesPreferencesPage
