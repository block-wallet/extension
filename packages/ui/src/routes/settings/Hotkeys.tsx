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

const LockTimeout = () => {
    const history = useOnMountHistory()!
    const hotkeysEnabledCurrentStatus = useBlankState()?.hotkeysEnabled ?? false
    const [hotkeysEnabled, setHotkeysAllowed] = useState(
        hotkeysEnabledCurrentStatus
    )
    const { isOpen, status, dispatch } = useWaitingDialog()
    const currentOS = getCurrentOS()

    const onSave = useCallback(async () => {
        try {
            dispatch({ type: "open", payload: { status: "loading" } })

            await setHotkeysEnabled(hotkeysEnabled)

            dispatch({ type: "setStatus", payload: { status: "success" } })
        } catch (error) {
            dispatch({ type: "setStatus", payload: { status: "error" } })
            // throw new Error("Could not update the lock timeout")
        }
    }, [dispatch, hotkeysEnabled])

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
                    success: "Your changes have been succesfully saved!",
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
                <span className="text-sm text-gray-500 mb-6">
                    Use keyboard shortcuts for faster navigation and actions in
                    the wallet.
                </span>
                <ToggleButton
                    label="Enable shortcuts"
                    defaultChecked={hotkeysEnabledCurrentStatus}
                    onToggle={(checked: boolean) => {
                        setHotkeysAllowed(checked)
                    }}
                />
                <DisplayHotkey
                    description="Open/close the extension"
                    alt
                    hotkey="O"
                    currentOS={currentOS}
                    className="mt-7 mb-4"
                />
                <Divider />
                <DisplayHotkey
                    description="Shortcuts"
                    alt
                    hotkey="K"
                    currentOS={currentOS}
                    className="mt-4 mb-4"
                />
                {hotkeysEnabled && (
                    <>
                        <Divider />
                        <DisplayHotkey
                            description="Lock Wallet"
                            ctrl
                            alt
                            hotkey="L"
                            currentOS={currentOS}
                            className="mt-4 mb-4"
                        />
                        <Divider />
                        <DisplayHotkey
                            description="Back to home"
                            alt
                            hotkey="Q"
                            currentOS={currentOS}
                            className="mt-4 mb-4"
                        />
                        <Divider />
                        {/* Dont use DisplayHotkey component to show backspace as it is a different key name */}
                        <div className="flex items-center justify-between w-full mt-4 mb-4">
                            <div className="font-bold text-sm">Go Back</div>
                            <div className="flex">
                                <div
                                    className="border border-gray-300 rounded-sm font-medium text-sm w-8 h-8 text-center grid content-center"
                                    style={{
                                        boxShadow:
                                            "0px 2px 0px 0px rgba(240, 240, 240, 1)",
                                    }}
                                >
                                    {currentOS === "mac" ? "⌥" : "Alt"}
                                </div>
                                <div className="p-1 font-medium text-sm">+</div>
                                <div
                                    className="border border-zinc-300 rounded-sm font-medium text-sm w-20 h-8 text-center grid content-center"
                                    style={{
                                        boxShadow:
                                            "0px 2px 0px 0px rgba(240, 240, 240, 1)",
                                    }}
                                >
                                    Backspace
                                </div>
                            </div>
                        </div>
                        <Divider className="border-gray-300" />
                        <span className="text-sm mt-4">
                            <a
                                href="https://blockwallet.io/docs/keyboard-shortcuts"
                                target="_blank"
                                className="text-primary-blue-default"
                                rel="noreferrer"
                            >
                                Click here
                            </a>{" "}
                            to see all keyboard shortcuts
                        </span>
                    </>
                )}
            </div>
        </PopupLayout>
    )
}

export default LockTimeout
