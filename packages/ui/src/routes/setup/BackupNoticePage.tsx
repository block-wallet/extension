import { useEffect, useState } from "react"

import classnames from "classnames"

import { Link } from "react-router-dom"

import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"
import { Classes } from "../../styles/classes"

import keyIcon from "../../assets/images/icons/key.svg"
import safeIcon from "../../assets/images/icons/safe.svg"
import yourBackupIcon from "../../assets/images/icons/your_backup.svg"

import LinkButton from "../../components/button/LinkButton"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import ClickToReveal from "../../components/label/ClickToReveal"
import { useBlankState } from "../../context/background/backgroundHooks"
import { closeCurrentTab } from "../../util/window"
import IdleComponent from "../../components/IdleComponent"

const SideTips = () => (
    <div className="flex space-x-8 w-full text-sm text-left text-primary-black-default">
        <div className="flex flex-col w-full p-4 space-y-4 rounded-md border border-primary-grey-default">
            <img src={keyIcon} className="w-5 h-5" alt="" />
            <span className="font-semibold">Your keys, your crypto</span>
            <span>
                Only you have access to your wallet and the funds in it.
            </span>
        </div>
        <div className="flex flex-col w-full p-4 space-y-4 rounded-md border border-primary-grey-default">
            <img src={safeIcon} className="w-5 h-5" alt="" />
            <span className="font-semibold">Keep your keys safe</span>
            <span>
                Never disclose your keys to anyone and store them offline.
            </span>
        </div>
        <div className="flex flex-col w-full p-4 space-y-4 rounded-md border border-primary-grey-default">
            <img src={yourBackupIcon} className="w-5 h-5" alt="" />
            <span className="font-semibold">Your keys are your backup</span>
            <span>
                Use keys if you forget your password or lose your device.
            </span>
        </div>
    </div>
)

const BackupNoticePage = () => {
    const { isUnlocked } = useBlankState()!
    useEffect(() => {
        if (!isUnlocked) {
            alert(
                "For security reasons the extension is now blocked. Login again in the extension to continue with the backup process."
            )
            closeCurrentTab()
        }
    }, [isUnlocked])

    const [revealed, setRevealed] = useState(false)
    const history: any = useOnMountHistory()
    const { seedPhrase, password } = history.location.state

    return (
        <IdleComponent>
            <PageLayout header maxWidth="max-w-[800px]" className="text-center">
                <span className="my-6 text-lg font-bold font-title">
                    Secret Phrase
                </span>
                <Divider />
                <div className="flex flex-col p-8 space-y-8 text-sm text-gray-600">
                    <span>
                        Your seed phrase is the key to your wallet. Use it to
                        recover your funds or access your wallet on other
                        devices. Back up your seed phrase and store it in a safe
                        place.
                    </span>
                    <SideTips />
                    <ClickToReveal
                        hiddenText={seedPhrase}
                        revealMessage={"Click here to reveal secret words"}
                        revealed={revealed}
                        onClick={() => setRevealed(true)}
                    />
                </div>
                <Divider />
                <div className="flex flex-row w-full p-6 justify-between">
                    <LinkButton
                        location="/setup/done"
                        text="Remind me later"
                        lite
                        classes="max-w-[200px]"
                    />
                    <Link
                        to={{
                            pathname: "/setup/create/verify",
                            state: { seedPhrase, isReminder: false, password },
                        }}
                        className={classnames(
                            Classes.button,
                            "max-w-[200px]",
                            !revealed && "opacity-50 pointer-events-none"
                        )}
                        draggable={false}
                    >
                        Next
                    </Link>
                </div>
            </PageLayout>
        </IdleComponent>
    )
}

export default BackupNoticePage
