import { Classes } from "../styles/classes"
import LogoHeader from "../components/LogoHeader"
import PageLayout from "../components/PageLayout"
import logo from "../assets/images/logo.svg"
import WarningTip from "../components/label/WarningTip"
import { useState } from "react"
import { useOnMountHistory } from "../context/hooks/useOnMount"
import IsBetaDialog from "../components/dialog/IsBetaDialog"

const IntroductionPage = () => {
    const history = useOnMountHistory()
    const [isBetaDiallogOpen, setIsBetaDiallogOpen] = useState(false)
    return (
        <PageLayout
            centered
            className="relative overflow-hidden"
            displayWarningTip={true}
        >
            <IsBetaDialog
                isOpen={isBetaDiallogOpen}
                onClick={() => {
                    history.push("/setup")
                }}
            />
            <div className="flex flex-col items-center relative mt-20 pt-10 mb-14 z-10">
                <LogoHeader />
                <div className="flex flex-col items-center my-12 space-y-6">
                    <span className="font-title font-semibold text-5xl">
                        BlockWallet
                    </span>
                    <div className="flex flex-col md:flex-row items-center space-x-1 w-52 md:w-full mx-auto text-gray-600 text-sm text-center">
                        <span>Have a transfer to make?</span>
                        <span>Reclaim your privacy with us.</span>
                    </div>
                </div>
                <button
                    className={Classes.button}
                    onClick={() => {
                        setIsBetaDiallogOpen(true)
                    }}
                >
                    Get Started
                </button>
            </div>
            <div
                className="absolute w-64 h-64 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5"
                style={{
                    color: "blue",
                    background: `url(${logo})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                }}
            />
        </PageLayout>
    )
}

export default IntroductionPage
