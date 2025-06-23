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
import { BsInfoCircle, BsNewspaper } from "react-icons/bs"

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
            header={
                <PopupHeader
                    title="Release Notes"
                    close="/"
                    onBack={() => history.push("/settings/preferences")}
                />
            }
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
            <SuccessDialog
                open={isSuccess}
                title="Release Notes"
                timeout={800}
                message="Your changes have been successfully saved!"
                onDone={history.goBack}
            />

            <div className="flex flex-col p-6 space-y-6 w-full">
                {/* Header Information */}
                <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <BsInfoCircle className="text-primary-blue-default dark:text-primary-blue-300 mt-0.5 flex-shrink-0" size={16} />
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Stay Informed About Updates
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                Enable this setting to receive notifications about new BlockWallet features,
                                improvements, and important updates. You'll be notified when new versions are available.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Release Notes Toggle Section */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1 flex-1">
                                <div className="flex items-center space-x-2">
                                    <BsNewspaper className="text-gray-600 dark:text-gray-400" size={16} />
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                        Release Notes Notifications
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Get notified about new features and updates
                                </p>
                            </div>
                            <div className="ml-4">
                                <ToggleButton
                                    label=""
                                    defaultChecked={subscribedReleaseNotes}
                                    onToggle={setSubscribedToReleaseNotes}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Info */}
                <div className={`p-4 rounded-lg border ${subscribedReleaseNotes
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                    }`}>
                    <div className="flex items-center space-x-2 text-sm">
                        <span className={`font-medium ${subscribedReleaseNotes
                            ? "text-green-700 dark:text-green-300"
                            : "text-gray-600 dark:text-gray-400"
                            }`}>
                            Status:
                        </span>
                        <span className={`${subscribedReleaseNotes
                            ? "text-green-600 dark:text-green-200"
                            : "text-gray-500 dark:text-gray-400"
                            }`}>
                            {subscribedReleaseNotes ? "Subscribed to release notes" : "Not subscribed to release notes"}
                        </span>
                    </div>
                    {subscribedReleaseNotes && (
                        <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                            You'll receive notifications when new updates are available
                        </p>
                    )}
                </div>

                {/* Additional Information */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        <span className="font-medium">Note:</span> Release notes help you understand what's new in each update,
                        including security improvements, bug fixes, and new features that enhance your wallet experience.
                    </p>
                </div>
            </div>
        </PopupLayout>
    )
}

export default ReleaseNotesPreferencesPage
