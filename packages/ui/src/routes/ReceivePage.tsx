import { useState } from "react"
import PopupLayout from "../components/popup/PopupLayout"
import PopupHeader from "../components/popup/PopupHeader"
import CopyTooltip from "../components/label/СopyToClipboardTooltip"
import QRCode from "qrcode.react"
import { useSelectedAccount } from "../context/hooks/useSelectedAccount"
import { useOnMountHistory } from "../context/hooks/useOnMount"
import { ViewOnExplorerButton } from "../components/button/ViewOnExplorerButtons"
import { useSelectedNetwork } from "../context/hooks/useSelectedNetwork"
import { formatName } from "../util/formatAccount"

// Icons
import { HiQrcode, HiClipboardCopy, HiInformationCircle, HiShieldCheck, HiExclamation } from "react-icons/hi"
import { BsCheckCircleFill } from "react-icons/bs"

const ReceivePage = () => {
    const history = useOnMountHistory()
    const account = useSelectedAccount()!
    const selectedNetwork = useSelectedNetwork()
    const accountAddress = history.location.state?.address ?? account.address
    const [copied, setCopied] = useState(false)
    const [showQRFullscreen, setShowQRFullscreen] = useState(false)

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(accountAddress)
        setCopied(true)
        await new Promise((resolve) => setTimeout(resolve, 2000))
        setCopied(false)
    }

    const accountName = formatName(account.name, 20)

    return (
        <PopupLayout
            header={
                <PopupHeader title="Receive Funds" keepState networkIndicator />
            }
            showProviderStatus
        >
            <div className="flex flex-col space-y-6 p-6 bg-white dark:bg-gray-900 min-h-full">
                {/* Header Section */}
                <div className="text-center space-y-3">
                    <div className="flex justify-center">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700">
                            <HiQrcode className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Receive {selectedNetwork.nativeCurrency.symbol}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Share your address to receive payments to <span className="font-semibold">{accountName}</span>
                        </p>
                    </div>
                </div>

                {/* QR Code Section */}
                <div className="space-y-4">
                    <div className="text-center">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            QR Code
                        </h3>
                        <div className="flex justify-center">
                            <div
                                className="bg-white p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => setShowQRFullscreen(true)}
                            >
                                <QRCode
                                    value={accountAddress}
                                    size={180}
                                    bgColor="#ffffff"
                                    fgColor="#000000"
                                    level="M"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Click to view fullscreen
                        </p>
                    </div>
                </div>

                {/* Address Section */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Wallet Address
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <button
                                type="button"
                                className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group relative"
                                onClick={copyToClipboard}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 pr-4">
                                        <div className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                                            {accountAddress}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                                            <span>Click to copy address</span>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 flex items-center space-x-2">
                                        {copied ? (
                                            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                                                <BsCheckCircleFill className="w-4 h-4" />
                                                <span className="text-xs font-semibold">Copied!</span>
                                            </div>
                                        ) : (
                                            <HiClipboardCopy className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                                        )}
                                    </div>
                                </div>
                                <CopyTooltip copied={copied} />
                            </button>
                        </div>
                    </div>

                    {/* Explorer Button */}
                    <ViewOnExplorerButton type="address" hash={accountAddress} />
                </div>

                {/* Security Information */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4">
                    <div className="flex items-start space-x-3">
                        <HiShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                                Security Tips
                            </h3>
                            <ul className="text-xs text-green-800 dark:text-green-200 space-y-1">
                                <li>• This address only works for {selectedNetwork.name} network</li>
                                <li>• Always verify the address before sharing it with others</li>
                                <li>• Only share your address with trusted sources</li>
                                <li>• Never share your private key or seed phrase</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Network Warning */}
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
                    <div className="flex items-start space-x-3">
                        <HiExclamation className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                Network Notice
                            </h3>
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                                This address is for <span className="font-semibold">{selectedNetwork.name}</span> only.
                                Sending tokens from other networks may result in permanent loss.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Usage Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                    <div className="flex items-start space-x-3">
                        <HiInformationCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                How to Use
                            </h3>
                            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                <li>• Share the QR code for quick mobile scanning</li>
                                <li>• Copy the address text for manual entry</li>
                                <li>• Use "View on Explorer" to check transaction history</li>
                                <li>• Ensure sender is using the same network</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fullscreen QR Modal */}
            {showQRFullscreen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowQRFullscreen(false)}>
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg border border-gray-200 dark:border-gray-700 max-w-sm w-full mx-4">
                        <div className="text-center space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Scan QR Code
                            </h3>
                            <div className="flex justify-center">
                                <QRCode
                                    value={accountAddress}
                                    size={240}
                                    bgColor="#ffffff"
                                    fgColor="#000000"
                                    level="H"
                                />
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
                                {accountAddress}
                            </div>
                            <button
                                onClick={() => setShowQRFullscreen(false)}
                                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PopupLayout>
    )
}

export default ReceivePage
