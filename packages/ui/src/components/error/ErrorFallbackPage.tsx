import { FunctionComponent } from "react"
import { Classes, classnames } from "../../styles"
import PopupFooter from "../popup/PopupFooter"
import PopupHeader from "../popup/PopupHeader"
import PopupLayout from "../popup/PopupLayout"
import { MdError } from "react-icons/md"
import { FaGithub, FaTelegram, FaTwitter, FaGlobe } from "react-icons/fa"
import { LINKS } from "../../util/constants"

const ErrorFallbackPage: FunctionComponent<{
    error: Error
    resetErrorBoundary: any
}> = ({
    error = Error("💣😎 ----ERROR FALLBACK---- 😎💣"),
    resetErrorBoundary,
}) => {
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
                        className={classnames(Classes.redButton)}
                    >
                        Reset
                    </button>
                </PopupFooter>
            }
        >
            <div className="flex flex-col space-y-6 p-6 justify-center items-center">
                <div className="flex flex-col space-y-6 p-4 items-center justify-center bg-primary-100 rounded-md">
                    <div className="text-sm">
                        <p>
                            An error ocurred while using <b>BlockWallet</b>.
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
                </div>

                <div className="flex flex-col w-full space-y-4 px-4 py-6 bg-primary-100 rounded-md">
                    <div className="flex flex-col space-y-4 text-xs">
                        <a
                            href={LINKS.WEBSITE_BUG_REPORT}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-row items-center space-x-3 hover:text-blue-600 hover:cursor-pointer"
                        >
                            <FaGlobe size={22} />
                            <p>Report it using our Bug Report Form.</p>
                        </a>
                        <a
                            href={LINKS.GITHUB_BUG_REPORT}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-row items-center space-x-3 hover:text-blue-600 hover:cursor-pointer"
                        >
                            <FaGithub size={22} />
                            <p>Create an Issue in GitHub.</p>
                        </a>
                        <a
                            href={LINKS.TELEGRAM}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-row items-center space-x-3 hover:text-blue-600 hover:cursor-pointer"
                        >
                            <FaTelegram size={22} />
                            <p>Contact us on Telegram.</p>
                        </a>
                        <a
                            href={LINKS.TWITTER}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-row items-center space-x-3 hover:text-blue-600 hover:cursor-pointer"
                        >
                            <FaTwitter size={22} />
                            <p>Contact us on Twitter.</p>
                        </a>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default ErrorFallbackPage
