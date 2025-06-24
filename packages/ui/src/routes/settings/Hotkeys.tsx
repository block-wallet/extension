import { useState, useCallback } from "react"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import PopupFooter from "../../components/popup/PopupFooter"
import { setHotkeysEnabled } from "../../context/commActions"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import ToggleButton from "../../components/button/ToggleButton"
import { useBlankState } from "../../context/background/backgroundHooks"
import Divider from "../../components/Divider"
import { DisplayHotkey } from "../../components/hotkeys/DisplayHotkey"
import { getCurrentOS } from "../../context/util/platform"
import { BsKeyboard, BsLightning, BsInfoCircle, BsCheck, BsX } from "react-icons/bs"

const Hotkeys = () => {
    const history = useOnMountHistory()
    const { hotkeysEnabled } = useBlankState()!
    const [hotkeysEnabledCurrentStatus, setHotkeysAllowed] = useState(
        hotkeysEnabled
    )
    const { status, isOpen, dispatch } = useWaitingDialog()
    const currentOS = getCurrentOS()

    const onSave = useCallback(async () => {
        try {
            dispatch({ type: "open", payload: { status: "loading" } })
            await setHotkeysEnabled(hotkeysEnabledCurrentStatus)
            dispatch({ type: "setStatus", payload: { status: "success" } })
        } catch (e) {
            dispatch({ type: "setStatus", payload: { status: "error" } })
        }
    }, [dispatch, hotkeysEnabledCurrentStatus])

    return (
        <PopupLayout
            submitOnEnter={{
                onSubmit: onSave,
                isEnabled: true,
            }}
            header={
                <PopupHeader
                    title="Keyboard Shortcuts"
                    close="/"
                    onBack={() => history.push("/settings/preferences")}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Save"
                        disabled={
                            hotkeysEnabledCurrentStatus === hotkeysEnabled
                        }
                        onClick={onSave}
                    />
                </PopupFooter>
            }
        >
            <WaitingDialog
                open={isOpen}
                status={status}
                titles={{
                    loading: "Loading",
                    success: "Congratulations",
                    error: "Error",
                }}
                texts={{
                    loading: "Saving your changes...",
                    success: "Your changes have been successfully saved!",
                    error: "There was an error while updating the hotkeys status",
                }}
                timeout={800}
                onDone={() => {
                    if (status === "error") {
                        dispatch({ type: "close" })
                        return
                    }

                    history.push("/")
                }}
            />

            <div className="flex flex-col p-6 pt-2 w-full">
                {/* Information Panel */}
                <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-gray-700 mb-6">
                    <div className="flex items-start space-x-3">
                        <BsKeyboard className="text-blue-600 dark:text-blue-400 text-lg mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-base font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                Keyboard Shortcuts
                            </h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Enable keyboard shortcuts for faster navigation and actions throughout the wallet.
                                Use keyboard combinations to quickly access features and perform operations.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status Display */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Shortcuts Status:
                        </span>
                        <span className={`inline-flex items-center space-x-1 text-sm font-semibold ${hotkeysEnabledCurrentStatus
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-600 dark:text-gray-400"
                            }`}>
                            {hotkeysEnabledCurrentStatus ? (
                                <><BsCheck className="w-4 h-4" /><span>Enabled</span></>
                            ) : (
                                <><BsX className="w-4 h-4" /><span>Disabled</span></>
                            )}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {hotkeysEnabledCurrentStatus
                            ? "Keyboard shortcuts are active throughout the wallet interface."
                            : "Keyboard shortcuts are currently disabled."
                        }
                    </p>
                </div>

                {/* Toggle Section */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                Enable Keyboard Shortcuts
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Turn on keyboard shortcuts to navigate the wallet faster and improve your workflow efficiency.
                            </p>
                        </div>
                        <ToggleButton
                            label="Enable shortcuts"
                            defaultChecked={hotkeysEnabledCurrentStatus}
                            onToggle={(checked: boolean) => {
                                setHotkeysAllowed(checked)
                            }}
                        />
                    </div>
                </div>

                {/* Essential Shortcuts Section */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <BsLightning className="text-yellow-500 dark:text-yellow-400 text-lg mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    Essential Shortcuts
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Core keyboard shortcuts that work throughout the wallet interface.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <DisplayHotkey
                                description="Open/close the extension"
                                alt
                                hotkey="O"
                                currentOS={currentOS}
                                className="py-2"
                            />
                            <Divider className="border-gray-200 dark:border-gray-700" />
                            <DisplayHotkey
                                description="Show all shortcuts"
                                alt
                                hotkey="K"
                                currentOS={currentOS}
                                className="py-2"
                            />
                        </div>
                    </div>
                </div>

                {/* Advanced Shortcuts Section (shown when enabled) */}
                {hotkeysEnabledCurrentStatus && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    Advanced Shortcuts
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Additional shortcuts for power users and advanced wallet operations.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <DisplayHotkey
                                    description="Lock Wallet"
                                    ctrl
                                    alt
                                    hotkey="L"
                                    currentOS={currentOS}
                                    className="py-2"
                                />
                                <Divider className="border-gray-200 dark:border-gray-700" />
                                <DisplayHotkey
                                    description="Back to home"
                                    alt
                                    hotkey="Q"
                                    currentOS={currentOS}
                                    className="py-2"
                                />
                                <Divider className="border-gray-200 dark:border-gray-700" />

                                {/* Custom Go Back display */}
                                <div className="flex items-center justify-between w-full py-2">
                                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Go Back</div>
                                    <div className="flex items-center space-x-1">
                                        <div className="border border-gray-300 dark:border-gray-600 rounded-sm font-medium text-sm w-8 h-8 text-center flex items-center justify-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm">
                                            {currentOS === "mac" ? "⌥" : "Alt"}
                                        </div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">+</span>
                                        <div className="border border-gray-300 dark:border-gray-600 rounded-sm font-medium text-sm w-20 h-8 text-center flex items-center justify-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm">
                                            Backspace
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Benefits Section */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mb-6">
                    <div className="flex items-start space-x-3">
                        <BsInfoCircle className="text-green-600 dark:text-green-400 text-lg mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                                Benefits of Keyboard Shortcuts
                            </h4>
                            <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                <p>• <span className="font-medium">Faster Navigation:</span> Quick access to any wallet feature</p>
                                <p>• <span className="font-medium">Improved Efficiency:</span> Streamlined workflow for frequent operations</p>
                                <p>• <span className="font-medium">Better Accessibility:</span> Enhanced usability for keyboard-first users</p>
                                <p>• <span className="font-medium">Power User Features:</span> Advanced shortcuts for experienced users</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Documentation Link */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Complete Shortcuts Reference
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            View the complete list of all available keyboard shortcuts and learn advanced navigation techniques.
                        </p>
                        <a
                            href="https://blockwallet.io/docs/keyboard-shortcuts"
                            target="_blank"
                            className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            rel="noreferrer"
                        >
                            View Full Shortcuts Documentation
                            <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default Hotkeys
