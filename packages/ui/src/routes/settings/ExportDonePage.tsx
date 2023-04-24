import { useState } from "react"

import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"

import PopupFooter from "../../components/popup/PopupFooter"
import copy from "../../assets/images/icons/copy.svg"
import CopyTooltip from "../../components/label/СopyToClipboardTooltip"
import LinkButton from "../../components/button/LinkButton"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import ClickToReveal from "../../components/label/ClickToReveal"
import {
    JsonView,
    defaultStyles,
    collapseAllNested,
} from "react-json-view-lite"
import DownloadIcon from "../../assets/images/icons/download.svg"

import "react-json-view-lite/dist/index.css"

const ExportDonePage = () => {
    const history: any = useOnMountHistory()
    const { exportData, exportType } = history.location.state

    const [revealed, setRevealed] = useState<boolean>(false)
    const [copied, setCopied] = useState(false)
    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(exportData)
        setCopied(true)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setCopied(false)
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Export Account Data"
                    close="/"
                    backButton={false}
                />
            }
            footer={
                <PopupFooter>
                    <LinkButton location="/" text="Done" classes="w-full" />
                </PopupFooter>
            }
        >
            <div className="flex flex-col p-6 space-y-6">
                {exportType !== "json" ? (
                    <div className="flex flex-col space-y-4">
                        <ClickToReveal
                            hiddenText={exportData}
                            revealMessage={`Click here to reveal ${exportType}`}
                            revealed={revealed}
                            onClick={() => setRevealed(true)}
                        />
                        <button
                            type="button"
                            className="relative flex flex-row items-stretch justify-between w-full rounded group bg-primary-100 hover:bg-primary-200"
                            onClick={copyToClipboard}
                        >
                            <span className="flex-grow px-4 py-4 text-sm ">
                                Copy {exportType} to clipboard
                            </span>
                            <span className="flex items-center justify-center px-4 transition duration-300 outline-none cursor-pointer border-1">
                                <img
                                    src={copy}
                                    alt="copy"
                                    className="w-4 h-4 mr-1"
                                />
                            </span>
                            <CopyTooltip copied={copied}></CopyTooltip>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-4 overflow-x-hidden">
                        <JsonView
                            data={JSON.parse(exportData)}
                            shouldInitiallyExpand={collapseAllNested}
                            style={{ ...defaultStyles, container: "" }}
                        />
                        <a
                            type="button"
                            className="relative flex flex-row items-stretch justify-between w-full rounded group bg-primary-100 hover:bg-primary-200"
                            href={`data:text/json;charset=utf-8,${encodeURIComponent(
                                exportData
                            )}`}
                            download="blockwallet.json"
                        >
                            <span className="flex-grow px-4 py-4 text-sm ">
                                Download JSON file
                            </span>
                            <span className="flex items-center justify-center px-4 transition duration-300 outline-none cursor-pointer border-1">
                                <img
                                    src={DownloadIcon}
                                    alt="Download JSON file"
                                />
                            </span>
                        </a>
                    </div>
                )}
                <div className="w-full px-4 py-4 text-sm text-center text-red-500 bg-red-100 rounded">
                    <strong className="font-bold">Warning: </strong>
                    <span>
                        Never disclose this information. Anyone with your
                        private keys can steal any assets held in your account.
                    </span>
                </div>
            </div>
        </PopupLayout>
    )
}

export default ExportDonePage
