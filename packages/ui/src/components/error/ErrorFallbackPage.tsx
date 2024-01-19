import { FunctionComponent, useState } from "react"
import { FiDownload } from "react-icons/fi"
import classNames from "classnames"
import { MdError } from "react-icons/md"
import { FaGithub, FaTelegram, FaGlobe } from "react-icons/fa"
import { Classes, classnames } from "../../styles"
import PopupFooter from "../popup/PopupFooter"
import PopupHeader from "../popup/PopupHeader"
import PopupLayout from "../popup/PopupLayout"
import { LINKS } from "../../util/constants"
import { postSlackMessage, resetAccount } from "../../context/commActions"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import WaitingDialog, { useWaitingDialog } from "../dialog/WaitingDialog"

import useStateLogs from "../../util/hooks/useStateLogs"
import ConfirmDialog from "../dialog/ConfirmDialog"

const ErrorFallbackPage: FunctionComponent<{
    error: Error
    resetErrorBoundary: any
}> = ({
    error = Error("💣😎 ----ERROR FALLBACK---- 😎💣"),
    resetErrorBoundary,
}) => {
    const { downloadStateLogsHandler } = useStateLogs()
    const account = useSelectedAccount()

    const [confirmOpen, setConfirmOpen] = useState(false)

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
            postSlackMessage(
                "Error trying to reset account.",
                error,
                "File: ErrorFallbackPage"
            )
        }
    }

    return (
        <PopupLayout
            header={
                <PopupHeader title="Error" close={false} backButton={false} />
            }
            footer={
                <PopupFooter>
                    <button
                        onClick={resetErrorBoundary}
                        type="button"
                        className={classnames(Classes.darkButton)}
                    >
                        Restart Wallet
                    </button>
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
                onDone={resetErrorBoundary}
                timeout={1100}
            />

            <ConfirmDialog
                title="Reset Account"
                message={`Resetting this account will clear its transaction history and added tokens. You will not need to re-import your seed phrase. Are you sure you want to proceed?`}
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleReset}
            />
            <div className="flex flex-col space-y-4 p-6 py-4 justify-center items-center">
                <div className="flex flex-col space-y-6 p-4 items-center justify-center bg-primary-grey-default rounded-md">
                    <div className="text-sm">
                        <p>
                            An error ocurred while using{" "}
                            <b>BlockWallet v{process.env.VERSION}</b>.
                            <br />
                            <br />
                            Please collect the information and report back to
                            the team describing your case and the following log:
                        </p>
                    </div>

                    <div className="flex flex-row items-center justify-start max-w-full self-start space-x-2">
                        <MdError size={24} className="flex text-red-400" />
                        <span className="flex text-red-400 text-xs break-all">
                            {error.message}
                        </span>
                    </div>
                    <div className="text-sm">
                        <p>
                            Please try restarting the wallet and contacting
                            support. If the issue persists, you can{" "}
                            <span
                                className="text-red-600 cursor-pointer"
                                onClick={() => setConfirmOpen(true)}
                            >
                                reset this account
                            </span>{" "}
                            state.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col w-full space-y-4 px-4 py-4 bg-primary-grey-default rounded-md">
                    <div className="flex flex-col space-y-4 text-xs">
                        <a
                            href={LINKS.GITHUB_BUG_REPORT}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-row items-center space-x-3 hover:text-primary-blue-default hover:cursor-pointer"
                        >
                            <FaGithub size={22} />
                            <p>Create an Issue in GitHub.</p>
                        </a>
                        <a
                            href={LINKS.WEBSITE_BUG_REPORT}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-row items-center space-x-3 hover:text-primary-blue-default hover:cursor-pointer"
                        >
                            <FaGlobe size={22} />
                            <p>Report it using our Bug Report Form.</p>
                        </a>
                        <a
                            href={LINKS.TELEGRAM}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-row items-center space-x-3 hover:text-primary-blue-default hover:cursor-pointer"
                        >
                            <FaTelegram size={22} />
                            <p>Contact us on Telegram.</p>
                        </a>
                    </div>
                </div>
                <div className="w-full border border-primary-grey-hover rounded-md flex justify-between items-center p-4 py-2">
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
            </div>
        </PopupLayout>
    )
}

export default ErrorFallbackPage
