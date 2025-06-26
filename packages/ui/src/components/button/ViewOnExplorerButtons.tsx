import { FunctionComponent } from "react"
import { useBlankState } from "../../context/background/backgroundHooks"
import { generateExplorerLink, getExplorerTitle } from "../../util/getExplorer"
import OpenExplorerIcon from "../icons/OpenExplorerIcon"

// Icons
import { HiExternalLink } from "react-icons/hi"

export const ViewOnExplorerButton: FunctionComponent<{
    type?: "tx" | "address"
    hash: string
    mode?: "button" | "icon"
}> = ({ type = "tx", hash, mode = "button" }) => {
    const { selectedNetwork, availableNetworks } = useBlankState()!
    const explorerName = getExplorerTitle(availableNetworks, selectedNetwork)
    const explorerLink = generateExplorerLink(
        availableNetworks,
        selectedNetwork,
        hash,
        type
    )

    return mode === "button" ? (
        <a
            className="group flex flex-row items-center justify-center py-3 px-4 w-full space-x-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
            href={explorerLink}
            target="_blank"
            rel="noopener noreferrer"
        >
            <HiExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
            <span>View on {explorerName}</span>
        </a>
    ) : (
        <a
            className="text-gray-600 dark:text-gray-400 hover:text-primary-blue-default dark:hover:text-primary-blue-400 cursor-pointer transition-colors"
            href={explorerLink}
            target="_blank"
            rel="noopener noreferrer"
            title={"View on " + explorerName}
        >
            <OpenExplorerIcon />
        </a>
    )
}
