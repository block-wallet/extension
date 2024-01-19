import { useState, useEffect, useCallback } from "react"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import PopupFooter from "../../components/popup/PopupFooter"
import {
    getIdleTimeout,
    postSlackMessage,
    setIdleTimeout,
} from "../../context/commActions"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import ToggleButton from "../../components/button/ToggleButton"
import Select from "../../components/input/Select"

const LockTimeout = () => {
    const history = useOnMountHistory()!
    const [currentTimeout, setCurrentTimeout] = useState(5)
    const [selectedTimeout, setSelectedTimeout] = useState(5)
    const [timeoutEnabled, setTimeoutEnabled] = useState(false)

    const { isOpen, status, dispatch } = useWaitingDialog()

    useEffect(() => {
        getIdleTimeout().then((timeout) => {
            setTimeoutEnabled(timeout !== 0)
            setCurrentTimeout(timeout)
            setSelectedTimeout(timeout)
        })
    }, [])

    useEffect(() => {
        setSelectedTimeout(
            timeoutEnabled ? (currentTimeout === 0 ? 5 : currentTimeout) : 0
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeoutEnabled])

    const onSave = useCallback(async () => {
        try {
            dispatch({ type: "open", payload: { status: "loading" } })

            await setIdleTimeout(selectedTimeout)

            dispatch({ type: "setStatus", payload: { status: "success" } })
        } catch (error) {
            dispatch({ type: "setStatus", payload: { status: "error" } })
            // throw new Error("Could not update the lock timeout")
            postSlackMessage(
                "Error saving lock timeout.",
                error,
                "File: LockTimeout"
            )
        }
    }, [dispatch, selectedTimeout])

    return (
        <PopupLayout
            submitOnEnter={{
                onSubmit: onSave,
                isEnabled: selectedTimeout !== currentTimeout,
            }}
            header={
                <PopupHeader
                    title="Lock Timeout"
                    close="/"
                    onBack={() => history.push("/settings/preferences")}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Save"
                        disabled={selectedTimeout === currentTimeout}
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
                    error: "There was an error while updating the lock timeout",
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
                <span className="text-sm text-primary-grey-dark">
                    BlockWallet will automatically lock and require an
                    additional login after the selected period.
                </span>
                <ToggleButton
                    label="Enabled"
                    defaultChecked={timeoutEnabled}
                    onToggle={(checked: boolean) => {
                        setTimeoutEnabled(checked)
                    }}
                />
                {timeoutEnabled && selectedTimeout !== 0 && (
                    <div className="flex flex-col space-y-2">
                        <Select
                            onChange={setSelectedTimeout}
                            currentValue={selectedTimeout}
                            id="period"
                            label="Period"
                        >
                            <Select.Option value={1}>1 minute</Select.Option>
                            <Select.Option value={3}>3 minutes</Select.Option>
                            <Select.Option value={5}>5 minutes</Select.Option>
                            <Select.Option value={15}>15 minutes</Select.Option>
                            <Select.Option value={30}>30 minutes</Select.Option>
                            <Select.Option value={60}>1 hour</Select.Option>
                            <Select.Option value={180}>3 hours</Select.Option>
                            <Select.Option value={360}>6 hours</Select.Option>
                            <Select.Option value={720}>12 hours</Select.Option>
                            <Select.Option value={1440}>1 day</Select.Option>
                        </Select>
                    </div>
                )}
            </div>
        </PopupLayout>
    )
}

export default LockTimeout
