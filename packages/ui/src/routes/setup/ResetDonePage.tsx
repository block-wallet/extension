import React, { useEffect, useState } from "react"

import Confetti from "react-dom-confetti"

import LogoHeader from "../../components/LogoHeader"
import PageLayout from "../../components/PageLayout"

import logo from "../../assets/images/logo.svg"
import { completeSetup } from "../../context/commActions"

const ResetDonePage = () => {
    const [confettiActive, setConfettiActive] = useState(false)
    useEffect(() => {
        setConfettiActive(true)
        completeSetup()
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
                        <span className="font-title font-semibold text-5xl">
                            Reset completed!
                        </span>
                        <div className="flex flex-col md:flex-row items-center space-x-1 w-52 md:w-full mx-auto text-gray-600 text-sm text-center leading-loose">
                            <span>
                                You're ready to start using BlockWallet again.
                                <br />
                                The wallet has been reset with a new seed
                                phrase.
                                <br />
                                Access BlockWallet via the extensions section of
                                your browser.
                            </span>
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

export default ResetDonePage
