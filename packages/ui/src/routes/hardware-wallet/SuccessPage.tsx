import { useEffect, useState } from "react"

import Confetti from "react-dom-confetti"

import LogoHeader from "../../components/LogoHeader"
import PageLayout from "../../components/PageLayout"

import logo from "../../assets/images/logo.svg"
import { Devices } from "../../context/commTypes"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { capitalize } from "../../util/capitalize"

const HardwareWalletSuccessPage = () => {
    const history = useOnMountHistory()!

    const vendor = history.location.state.vendor as Devices
    const reconnect = (history.location.state.reconnect as boolean) ?? false

    const vendorName = capitalize(vendor.toString().toLowerCase())

    const [confettiActive, setConfettiActive] = useState(false)
    useEffect(() => {
        setConfettiActive(true)
    }, [])
    const config = {
        angle: 90,
        spread: 360,
        startVelocity: 40,
        elementCount: 70,
        dragFriction: 0.12,
        duration: 3000,
        stagger: 3,
        width: "10px",
        height: "10px",
        perspective: "500px",
        colors: ["#000", "#333", "#666"],
    }
    return (
        <>
            <div className="absolute w-full h-full flex flex-row items-center justify-center overflow-hidden z-10">
                <Confetti active={confettiActive} config={config} />
            </div>
            <PageLayout centered className="relative overflow-hidden">
                <div className="flex flex-col items-center relative py-14 z-10">
                    <LogoHeader />
                    <div className="flex flex-col items-center my-12 space-y-6">
                        <span className="font-title font-semibold text-5xl text-center">
                            {vendorName}{" "}
                            {!reconnect ? "import completed!" : "reconnected!"}
                        </span>
                        <div className="flex flex-col md:flex-row items-center space-x-1 w-92 px-4 md:px-0 md:w-full mx-auto text-gray-600 text-sm text-center leading-loose justify-center">
                            {!reconnect ? (
                                <span>
                                    Your {vendorName} accounts were imported
                                    successfully.
                                    <br />
                                    You can now access them in BlockWallet.
                                    <br />
                                    Open the wallet via the extensions section
                                    of your browser.
                                </span>
                            ) : (
                                <span>
                                    Your {vendorName} device has been
                                    reconnected successfully.
                                    <br />
                                    You can continue with your current flow
                                    normally.
                                    <br />
                                    Open the wallet via the extensions section
                                    of your browser.
                                </span>
                            )}
                        </div>
                    </div>
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
        </>
    )
}

export default HardwareWalletSuccessPage
