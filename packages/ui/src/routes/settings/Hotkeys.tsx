import { useState, useEffect, useCallback } from "react"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import PopupFooter from "../../components/popup/PopupFooter"
import { getHotkeysEnabled, setHotkeysEnabled } from "../../context/commActions"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import ToggleButton from "../../components/button/ToggleButton"

const LockTimeout = () => {
    const history = useOnMountHistory()!
    const [hotkeysEnabledCurrentStatus, setHotkeysEnabledCurrentStatus] =
        useState(true)
    const [hotkeysEnabled, setHotkeysAllowed] = useState(true)

    const { isOpen, status, dispatch } = useWaitingDialog()

    useEffect(() => {
        getHotkeysEnabled().then((currentStatus) => {
            setHotkeysEnabledCurrentStatus(currentStatus)
        })
    }, [])

    // useEffect(() => {
    //     setSelectedTimeout(
    //         timeoutEnabled ? (currentTimeout === 0 ? 5 : currentTimeout) : 0
    //     )
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [timeoutEnabled])

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
            header={<PopupHeader title="Hotkeys" />}
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
            <div className="flex flex-col p-6 space-y-6 w-full">
                <span className="text-sm text-gray-500">
                    BlockWallet will allow you navigate throw the extension
                    using hotkeys. You can see the hotkey's list here.
                </span>
                <ToggleButton
                    label="Enabled"
                    defaultChecked={hotkeysEnabledCurrentStatus}
                    onToggle={(checked: boolean) => {
                        setHotkeysAllowed(checked)
                    }}
                />
            </div>
        </PopupLayout>
    )
}

export default LockTimeout
