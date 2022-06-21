import React, { useEffect, useState } from "react"

import classnames from "classnames"

import { Link } from "react-router-dom"

import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"
import { Classes } from "../../styles/classes"

import drawerIcon from "../../assets/images/icons/drawer.svg"
import penIcon from "../../assets/images/icons/pen.svg"
import backupIcon from "../../assets/images/icons/backup.svg"
import LinkButton from "../../components/button/LinkButton"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import ClickToReveal from "../../components/label/ClickToReveal"
import { useBlankState } from "../../context/background/backgroundHooks"
import { closeCurrentTab } from "../../util/window"
import IdleComponent from "../../components/IdleComponent"

const SideTips = () => (
    <div className="flex flex-col justify-between h-full w-full space-y-6 text-sm text-left md:w-64 md:ml-6">
        <div className="flex flex-col w-full p-6 space-y-4 rounded-md bg-primary-200">
            <img src={drawerIcon} className="w-5 h-5" alt="" />
            <span>
                Store this phrase in a password manager like{" "}
                <b className="text-gray-900">1Password</b>.
            </span>
        </div>
        <div className="flex flex-col w-full p-6 space-y-4 rounded-md bg-primary-200">
            <img src={penIcon} className="w-5 h-5" alt="" />
            <span>
                Write this phrase on pieces of paper and store each in{" "}
                <b className="text-gray-900">2 - 3</b> different locations.
            </span>
        </div>
        <div className="flex flex-col w-full p-6 space-y-4 rounded-md bg-primary-200">
            <img src={backupIcon} className="w-5 h-5" alt="" />
            <span>
                <b className="text-gray-900">Download</b> this Secret Backup
                Phrase and keep it stored safely on an external encrypted hard
                drive or storage medium.
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
            <PageLayout
                header
                maxWidth="max-w-md"
                className="text-center"
                sideComponent={
                    <div className="hidden md:block">
                        <SideTips />
                    </div>
                }
            >
                <span className="my-6 text-lg font-bold font-title">
                    Seed Phrase
                </span>
                <Divider />
                <div className="flex flex-col p-8 space-y-8 text-sm text-gray-600">
                    <span>
                        Your seed phrase is the key to your wallet and your
                        privacy deposits. It makes it possible to restore your
                        wallet after losing access. Import your seed phrase to
                        gain access to the funds held on your BlockWallet.
                        Backup your seed phrase and store it in a safe place.
                    </span>
                    <div className="md:hidden">
                        <SideTips />
                    </div>
                    <span>
                        <b className="text-gray-900">Warning:</b> Never disclose
                        your seed phrase. Anyone asking for your seed phrase is
                        most likely trying to steal your funds.
                    </span>
                    <ClickToReveal
                        hiddenText={seedPhrase}
                        revealMessage={"Click here to reveal secret words"}
                        revealed={revealed}
                        onClick={() => setRevealed(true)}
                    />
                </div>
                <Divider />
                <div className="flex flex-row w-full p-6 space-x-4">
                    <LinkButton
                        location="/setup/done"
                        text="Remind me later"
                        lite
                    />
                    <Link
                        to={{
                            pathname: "/setup/create/verify",
                            state: { seedPhrase, isReminder: false, password },
                        }}
                        className={classnames(
                            Classes.button,
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
