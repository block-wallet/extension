import classNames from "classnames"
import { FiDownload } from "react-icons/fi"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"

import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"

import { resetAccount, lockApp } from "../../context/commActions"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { Classes } from "../../styles"
import useStateLogs from "../../util/hooks/useStateLogs"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"

const ResetAccountPage = () => {
    const account = useSelectedAccount()
    const { downloadStateLogsHandler } = useStateLogs()

    const { isOpen, status, dispatch } = useWaitingDialog()

    const handleReset = async () => {
        dispatch({
            type: "open",
            payload: { status: "loading" },
        })
        try {
            await resetAccount(account.address)
            setTimeout(() => {
                dispatch({
                    type: "setStatus",
                    payload: { status: "success" },
                })
            }, 1000)
        } catch (error) {
            dispatch({
                type: "setStatus",
                payload: { status: "error" },
            })
        }
    }

    return (
        <PopupLayout
            header={<PopupHeader title="Reset Account" />}
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label={"Reset"}
                        type="reset"
                        onClick={handleReset}
                    />
                </PopupFooter>
            }
        >
            <WaitingDialog
                status={status}
                open={isOpen}
                titles={{
                    loading: "Resetting account...",
                    error: "Error",
                    success: "Success!",
                }}
                texts={{
                    loading: "Please wait while the account is being reset...",
                    error: "There was an error while resetting the account",
                    success: `Resetting account was successful.`,
                }}
                onDone={lockApp}
                timeout={1100}
            />
            <div className="flex flex-col p-6 space-y-6 w-full">
                <div className="text-sm text-primary-grey-dark">
                    <span>
                        Resetting your account will clear the transaction
                        history and added tokens. You will not need to re-import
                        your seed phrase and your on-chain balance will not
                        change. You will be able to use your account normally.
                    </span>
                    <div className="w-full border border-primary-grey-hover rounded-md flex justify-between items-center p-4 py-2 my-6">
                        <span className="text-xs mr-2">
                            Download state logs for support
                        </span>
                        <button
                            className={classNames(Classes.smallButton, "px-4")}
                            onClick={downloadStateLogsHandler}
                        >
                            <FiDownload size={18} />
                        </button>
                    </div>
                    <span>
                        Please download your state logs if you need support
                        before resetting your account.
                    </span>
                </div>
            </div>
        </PopupLayout>
    )
}

export default ResetAccountPage
