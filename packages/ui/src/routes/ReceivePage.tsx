import { useState } from "react"
import PopupLayout from "../components/popup/PopupLayout"
import PopupHeader from "../components/popup/PopupHeader"
import CopyTooltip from "../components/label/СopyToClipboardTooltip"
import QRCode from "qrcode.react"
import { useSelectedAccount } from "../context/hooks/useSelectedAccount"
import { useOnMountHistory } from "../context/hooks/useOnMount"
import { ViewOnExplorerButton } from "../components/button/ViewOnExplorerButtons"

const ReceivePage = () => {
    const history = useOnMountHistory()
    const account = useSelectedAccount()!
    const accountAddress = history.location.state?.address ?? account.address
    const [copied, setCopied] = useState(false)
    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(accountAddress)
        setCopied(true)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setCopied(false)
    }

    return (
        <PopupLayout
            header={
                <PopupHeader title="Receive Funds" keepState networkIndicator />
            }
            showProviderStatus
        >
            <div className="flex items-center justify-center my-6">
                <QRCode value={accountAddress} />
            </div>
            <hr />
            <div className="flex flex-col items-center justify-center w-full mt-6 px-6">
                <button
                    type="button"
                    className="flex flex-row items-stretch justify-between group relative w-full bg-primary-grey-default rounded-lg hover:bg-primary-grey-hover cursor-pointer"
                    onClick={copyToClipboard}
                >
                    <span className="flex-grow py-4 px-4 ">
                        <input
                            value={accountAddress}
                            disabled
                            className="flex flex-row items-center justify-start w-full bg-opacity-0 truncate text-primary-black-default text-sm font-semibold outline-none cursor-pointer"
                        />
                    </span>
                    <CopyTooltip copied={copied}></CopyTooltip>
                </button>
                <ViewOnExplorerButton type="address" hash={accountAddress} />
            </div>
        </PopupLayout>
    )
}
export default ReceivePage
