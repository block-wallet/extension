import { FunctionComponent, useState } from "react"
import { IoMdEye } from "react-icons/io"
import { classnames } from "../../styles/classes"
import { FiDownload } from "react-icons/fi"

interface ClickToRevealProps {
    /**
     * Text to reveal
     */
    hiddenText: string
    /**
     * Message to display when not revealed
     */
    revealMessage: string
    /**
     * Whether the content is revealed
     */
    revealed: boolean
    /**
     * Callback when clicking reveal
     */
    onClick: () => void
    /**
     * Optional className
     */
    className?: string
    /**
     * Allow downloading as text file
     */
    allowDownload?: boolean
    /**
     * Compact layout optimized for extension popup (reduced paddings/sizes)
     */
    compact?: boolean
}

const ClickToReveal: FunctionComponent<ClickToRevealProps> = ({
    hiddenText,
    revealMessage,
    revealed,
    onClick,
    className,
    allowDownload = false,
    compact = false,
}) => {
    const [copied, setCopied] = useState(false)

    const copyToClipboard = (e: React.MouseEvent) => {
        e.stopPropagation()
        navigator.clipboard.writeText(hiddenText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const downloadAsFile = (e: React.MouseEvent) => {
        e.stopPropagation()
        const element = document.createElement("a")
        const file = new Blob([hiddenText], { type: "text/plain" })
        element.href = URL.createObjectURL(file)
        element.download = "blockwallet-seed-phrase.txt"
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
    }

    return (
        <div
            className={classnames(
                "flex flex-col items-center justify-center w-full border border-primary-grey-hover rounded-lg transition-all",
                revealed
                    ? compact
                        ? "bg-primary-blue-50 p-3"
                        : "bg-primary-blue-50 p-6"
                    : compact
                    ? "min-h-[100px] cursor-pointer"
                    : "min-h-[150px] cursor-pointer",
                className
            )}
            onClick={!revealed ? onClick : undefined}
        >
            {revealed ? (
                <div className="w-full">
                    <div className={compact ? "flex justify-between items-center mb-2" : "flex justify-between items-center mb-3"}>
                        <span className={compact ? "text-xs font-semibold text-gray-900 dark:text-gray-100" : "text-sm font-semibold text-primary-blue-default"}>
                            Your Secret Recovery Phrase
                        </span>
                        <div className="flex space-x-2">
                            {allowDownload && (
                                <button
                                    className={compact ? "p-1 text-gray-600 dark:text-gray-300 hover:text-primary-blue-default rounded hover:bg-primary-blue-100" : "p-2 text-gray-600 hover:text-primary-blue-default rounded-full hover:bg-primary-blue-100"}
                                    onClick={downloadAsFile}
                                    title="Download as file"
                                >
                                    <FiDownload size={16} />
                                </button>
                            )}
                            <button
                                className={compact ? "p-1 text-gray-600 dark:text-gray-300 hover:text-primary-blue-default rounded hover:bg-primary-blue-100" : "p-2 text-gray-600 hover:text-primary-blue-default rounded-full hover:bg-primary-blue-100"}
                                onClick={copyToClipboard}
                                title="Copy to clipboard"
                            >
                                {copied ? (
                                    <span className="text-[10px]">Copied!</span>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className={compact ? "grid grid-cols-3 gap-2 text-[11px]" : "grid grid-cols-3 sm:grid-cols-4 gap-3 text-sm"}>
                        {hiddenText.split(" ").map((word, index) => (
                            <div
                                key={index}
                                className={compact ? "flex items-center p-1.5 border border-primary-grey-hover rounded bg-white dark:bg-gray-800" : "flex items-center p-2 border border-primary-grey-hover rounded-md bg-white dark:bg-gray-800"}
                            >
                                <span className={compact ? "text-gray-400 dark:text-gray-400 text-[10px] mr-2" : "text-gray-400 dark:text-gray-400 text-xs mr-2"}>{index + 1}.</span>
                                <span className={compact ? "font-medium break-all text-gray-900 dark:text-gray-100" : "font-medium text-gray-900 dark:text-gray-100"}>{word}</span>
                            </div>
                        ))}
                    </div>
                    {!compact && (
                        <div className="mt-4 text-xs text-primary-grey-dark bg-yellow-50 p-3 rounded border border-yellow-200">
                            <strong>Warning:</strong> Never share your secret recovery phrase with anyone. Anyone with this phrase can take your assets forever.
                        </div>
                    )}
                </div>
            ) : (
                <div className={compact ? "flex flex-col items-center justify-center space-y-2 p-3" : "flex flex-col items-center justify-center space-y-3 p-4"}>
                    <div className={compact ? "w-9 h-9 rounded-full bg-primary-grey-default flex items-center justify-center" : "w-12 h-12 rounded-full bg-primary-grey-default flex items-center justify-center"}>
                        <IoMdEye className={compact ? "text-xl text-gray-600" : "text-2xl text-gray-600"} />
                    </div>
                    <span className={compact ? "text-primary-grey-dark text-xs" : "text-primary-grey-dark text-sm"}>{revealMessage}</span>
                </div>
            )}
        </div>
    )
}

export default ClickToReveal
