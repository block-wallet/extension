import {
    Note,
    ReleaseNote,
} from "@block-wallet/background/controllers/PreferencesController"
import React, { FC } from "react"
import { useHistory } from "react-router-dom"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import PopupFooter from "../popup/PopupFooter"
import PopupLayout from "../popup/PopupLayout"
import Info from "./Info"

interface ReleaseNotesInfoProps {
    releaseNotes: ReleaseNote[]
    onDismiss?: () => void
}
const ReleaseNotesInfo: FC<ReleaseNotesInfoProps> = ({
    releaseNotes,
    onDismiss,
}) => {
    const history = useHistory()
    const sections = releaseNotes.flatMap(({ sections }) => sections)
    const notesGroupedByTitle = sections.reduce(
        (acc, section) => ({
            ...acc,
            [section.title]: [...(acc[section.title] || []), ...section.notes],
        }),
        {} as {
            [key: string]: Note[]
        }
    )
    const dismiss = () => {
        if (onDismiss) {
            return onDismiss()
        }
        history.push("/home")
    }
    return (
        <PopupLayout
            footer={
                <PopupFooter>
                    <ButtonWithLoading onClick={dismiss} label="Lets Go!" />
                </PopupFooter>
            }
        >
            <div className="w-full p-6 bg-white bg-opacity-75 scroll-smooth scroll-auto overflow-y-scroll">
                <Info>
                    <Info.Title>What's new on BlockWallet</Info.Title>
                    <div className="p-1 pt-6">
                        {Object.keys(notesGroupedByTitle).map((title) => {
                            const notes = notesGroupedByTitle[title]
                            notes.sort((a: Note, b: Note) =>
                                a.type.localeCompare(b.type)
                            )
                            return (
                                <div key={title}>
                                    <span className="font-bold text-sm">
                                        {title}
                                    </span>
                                    <Info.List className="pt-3">
                                        {notes.map((note) => (
                                            <Info.Item
                                                key={note.message}
                                                type={note.type}
                                            >
                                                {note.message}
                                            </Info.Item>
                                        ))}
                                    </Info.List>
                                </div>
                            )
                        })}
                    </div>
                </Info>
            </div>
        </PopupLayout>
    )
}

export default ReleaseNotesInfo
