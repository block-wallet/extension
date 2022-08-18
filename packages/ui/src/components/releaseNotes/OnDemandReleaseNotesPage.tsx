import { FC, useEffect } from "react"
import { useParams } from "react-router-dom"
import ReleaseNotesInfo from "../info/ReleaseNotesInfo"
import { generateOnDemandReleaseNotes } from "../../context/commActions"
import useAsyncInvoke from "../../util/hooks/useAsyncInvoke"

import { ReleaseNote } from "@block-wallet/background/controllers/PreferencesController"

const OnDemandReleaseNotesPage: FC = () => {
    const { version } = useParams<{ version: string }>()

    const { run, data } = useAsyncInvoke<ReleaseNote[]>({ data: [] })

    useEffect(() => {
        run(generateOnDemandReleaseNotes(version))
    }, [run, version])

    return <ReleaseNotesInfo releaseNotes={data || []} />
}

export default OnDemandReleaseNotesPage
