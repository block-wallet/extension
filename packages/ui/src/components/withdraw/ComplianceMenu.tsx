import React, { useRef } from "react"

// Style
import { classnames } from "../../styles/classes"

// Assets
import copy from "../../assets/images/icons/copy.svg"
import openIcon from "../../assets/images/icons/open_external.svg"

// Context
import { getDepositFormattedNote } from "../../context/commActions"

// Utils
import { useOnClickOutside } from "../../util/useOnClickOutside"

// Types
type ComplianceMenuType = {
    withdrawId: string
    active?: boolean
    setActive?: (value: boolean) => void
    position?: string
}

/**
 * ComplianceMenu:
 * Popup for compliance features.
 * When passed a state tornado withdrawal transaction, it can fetch tornado node and a link to compliance website.
 *
 * @param withdrawId - String, A state tornado withdrawal transaction id.
 * @param active - Boolean, wheter the menu is display or not.
 * @param setActive - Method, set active boolean true or false to trigger display.
 * @param position - String, define display position relative to parent.
 */
const ComplianceMenu = (props: ComplianceMenuType) => {
    const { withdrawId, active, setActive, position } = props

    const ref = useRef(null)
    useOnClickOutside(ref, () => {
        if (setActive) setActive(false)
    })

    const copyToClipboard = async (data: string) => {
        await navigator.clipboard.writeText(data)
    }

    const handleCopyNote = async (id: string) => {
        const note: any = await getDepositFormattedNote(id)
        copyToClipboard(note)
        if (setActive) setActive(false)
    }

    return (
        <div
            className={classnames(
                "flex flex-col w-48 mt-2 absolute right-4 z-50 rounded-md bg-white shadow-md",
                active ? "" : "hidden select-none pointer-events-none",
                position ? position : ""
            )}
            ref={ref}
        >
            {/* Copy */}
            <div
                className="flex w-full justify-start p-5 pt-4 cursor-pointer text-red-500 p-2 items-center hover:bg-gray-100"
                onClick={() => handleCopyNote(withdrawId)}
                ref={ref}
            >
                <img src={copy} alt="visit" className="w-5 h-5 mr-3" />
                <span className="text-sm font-bold text-gray-900 inline-flex">
                    Copy note
                </span>
            </div>
            {/* Fetch */}
            <a
                href="https://blockwallet.io/compliance.html"
                target="_blank" // 😎
                className="flex w-full justify-start p-5 pt-4 cursor-pointer text-red-500 p-2 items-center hover:bg-gray-100"
                rel="noreferrer"
            >
                <img src={openIcon} alt="visit" className="w-5 h-5 mr-3" />
                <span className="text-sm font-bold text-gray-900 inline-flex">
                    Fetch report
                </span>
            </a>
        </div>
    )
}

export default ComplianceMenu
