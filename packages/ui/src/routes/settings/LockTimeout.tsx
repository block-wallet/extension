import { useState, useEffect, useCallback } from "react"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import PopupFooter from "../../components/popup/PopupFooter"
import { getIdleTimeout, setIdleTimeout } from "../../context/commActions"
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
                {/* Main Description */}
                <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    BlockWallet will automatically lock and require an
                    additional login after the selected period.
                </div>

                {/* Enhanced Toggle Section */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <ToggleButton
                        label="Auto-lock enabled"
                        defaultChecked={timeoutEnabled}
                        onToggle={(checked: boolean) => {
                            setTimeoutEnabled(checked)
                        }}
                    />
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {timeoutEnabled
                            ? "Wallet will lock automatically after the selected time period"
                            : "Wallet will only lock when manually locked"
                        }
                    </div>
                </div>

                {/* Period Selection */}
                {timeoutEnabled && selectedTimeout !== 0 && (
                    <div className="flex flex-col space-y-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Lock After
                        </div>
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                            <Select
                                onChange={setSelectedTimeout}
                                currentValue={selectedTimeout}
                                id="period"
                                label=""
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

                        {/* Helpful Info */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <div className="text-xs text-blue-700 dark:text-blue-300">
                                💡 <span className="font-medium">Tip:</span> Shorter timeouts provide better security but may be less convenient for frequent use.
                            </div>
                        </div>
                    </div>
                )}

                {/* Security Note */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-start space-x-2">
                        <div className="flex-shrink-0 w-4 h-4 mt-0.5">
                            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-gray-900 dark:text-gray-100">Security Note:</span> Your wallet will automatically lock and require your password to unlock. This helps protect your funds if you step away from your device.
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default LockTimeout
