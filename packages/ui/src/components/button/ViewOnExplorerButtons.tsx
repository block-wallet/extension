import React, { FunctionComponent } from "react"
import openIcon from "../../assets/images/icons/open_external.svg"
import { useBlankState } from "../../context/background/backgroundHooks"
import { generateExplorerLink, getExplorerTitle } from "../../util/getExplorer"
import OpenExplorerIcon from "../icons/OpenExplorerIcon"

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
            className="flex flex-row items-center justify-start py-4 px-4 mt-4 w-full space-x-2 bg-primary-100 rounded-md text-black text-sm font-bold hover:bg-primary-200"
            href={explorerLink}
            target="_blank"
            rel="noopener noreferrer"
        >
            <img src={openIcon} alt="visit" className="w-5 h-5 mr-1" />
            <span>View on {explorerName}</span>
        </a>
    ) : (
        <a
            className="text-black hover:text-primary-300 cursor-pointer"
            href={explorerLink}
            target="_blank"
            rel="noopener noreferrer"
            title={"View on " + explorerName}
        >
            <OpenExplorerIcon />
        </a>
    )
}
