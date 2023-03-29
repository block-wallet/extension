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
    const hotkeysEnabledCurrentStatus = useBlankState()?.hotkeysEnabled ?? true
    const [hotkeysEnabled, setHotkeysAllowed] = useState(true)
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
            <div className="flex flex-col p-6 pt-2 space-y-4 w-full">
                <span className="text-sm text-gray-500">
                    You can press these buttons anytime on your keyboard to use
                    BlockWallet faster.
                </span>
                <ToggleButton
                    label="Enabled shortcuts"
                    defaultChecked={hotkeysEnabledCurrentStatus}
                    onToggle={(checked: boolean) => {
                        setHotkeysAllowed(checked)
                    }}
                />
                <DisplayHotkey
                    description="Shortcuts"
                    alt
                    hotkey="K"
                    currentOS={currentOS}
                />
                <Divider />
                <DisplayHotkey
                    description="Lock Wallet"
                    ctrl
                    alt
                    hotkey="L"
                    currentOS={currentOS}
                />
                <Divider />
                <DisplayHotkey
                    description="Close Wallet"
                    alt
                    hotkey="Q"
                    currentOS={currentOS}
                />
                <Divider />
                {/* Dont use component to show backspace as it is a different key name */}
                <div className="flex items-center justify-between w-full">
                    <div className="font-bold text-sm">Go Back</div>
                    <div className="flex">
                        <div
                            className="border border-gray-400 rounded-sm p-2 font-medium text-sm"
                            style={{
                                boxShadow:
                                    "0px 2px 0px 0px rgba(240, 240, 240, 1)",
                            }}
                        >
                            {currentOS === "mac" ? "⌥" : "Alt"}
                        </div>
                        <div className="p-2">+</div>
                        <div
                            className="border border-gray-400 rounded-sm p-2 font-medium w-20 text-sm inline-table"
                            style={{
                                boxShadow:
                                    "0px 2px 0px 0px rgba(240, 240, 240, 1)",
                            }}
                        >
                            Backspace
                        </div>
                    </div>
                </div>
                <Divider />
                <span className="text-sm">
                    Click here to see all keyboard shortcuts
                </span>
            </div>
        </PopupLayout>
    )
}

export default LockTimeout
