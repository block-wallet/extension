import { useState } from "react"

const useCopyToClipboard = (initialText?: string) => {
    const [copied, setCopied] = useState<boolean>(false)
    return {
        copied,
        //you can override the inital text if you want to.
        onCopy: async (text?: string) => {
            await navigator.clipboard.writeText(text || initialText || "")
            setCopied(true)
            await new Promise((resolve) => setTimeout(resolve, 1000))
            setCopied(false)
        },
    }
}

export default useCopyToClipboard
